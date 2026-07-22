# IMPLEMENTATION.md — Shri Gurudev Ashram App

**This document is the single source of truth for the Shri Gurudev Ashram platform implementation.**
Last updated: July 2026.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
   - [Frontend Architecture](#frontend-architecture)
   - [Backend Architecture](#backend-architecture)
   - [Authentication Flow](#authentication-flow)
   - [Database Architecture](#database-architecture)
   - [Payment Flow](#payment-flow)
   - [Notification Flow](#notification-flow)
3. [Feature Modules](#3-feature-modules)
   - [Authentication & Onboarding](#authentication--onboarding)
   - [User Profile & Identity Verification](#user-profile--identity-verification)
   - [Travel Packages & Dynamic Option Pricing](#travel-packages--dynamic-option-pricing)
   - [Travel Booking Pipeline](#travel-booking-pipeline)
   - [Seva Booking & Dynamic Calendar Availability](#seva-booking--dynamic-calendar-availability)
   - [Donations & 80G Receipts](#donations--80g-receipts)
   - [Payments & Order Life Cycle](#payments--order-life-cycle)
   - [Receipts & Documentation](#receipts--documentation)
   - [Notifications System](#notifications-system)
   - [Collector Program](#collector-program)
   - [Health & Diagnostics API](#health--diagnostics-api)
4. [API Endpoints Reference](#4-api-endpoints-reference)
   - [Travel & Seva Backend (Express + Supabase PostgreSQL)](#travel--seva-backend-express--supabase-postgresql)
   - [Donation Backend (Express + MongoDB)](#donation-backend-express--mongodb)
5. [Database Schema Reference](#5-database-schema-reference)
   - [PostgreSQL (Supabase) Schema](#postgresql-supabase-schema)
   - [MongoDB Schema](#mongodb-schema)
6. [Security Implementation](#6-security-implementation)
   - [Firebase & Dual JWT Token Model](#firebase--dual-jwt-token-model)
   - [Razorpay Signature & Idempotency](#razorpay-signature--idempotency)
   - [Ownership & Data Isolation](#ownership--data-isolation)
   - [Seat Lock & Booking Expiry](#seat-lock--booking-expiry)
   - [Rate Limiting & Input Validation](#rate-limiting--input-validation)
7. [Production Deployment & Infrastructure](#7-production-deployment--infrastructure)
   - [Health Monitoring](#health-monitoring)
   - [Environment Variables](#environment-variables)
   - [VPS, PM2 & Nginx Setup](#vps-pm2--nginx-setup)

---

## 1. Project Overview

**Shri Gurudev Ashram App** is a unified cross-platform mobile application for pilgrims and devotees. It enables devotional travel (Yatra) bookings, daily Annadan and Yajman Seva sponsorships, general donations with 80G tax benefits, and a donor referral (Collector) program.

### Technology Stack Summary

| Component | Stack / Technologies |
|---|---|
| **Mobile App** | Expo SDK 56, React Native, Expo Router, TypeScript, Zustand, React Query, Reanimated |
| **Travel & Seva Backend** | Express, Node.js, TypeScript, PostgreSQL via Supabase Admin SDK |
| **Donation Backend** | Express, Node.js, Mongoose, MongoDB (`mainDb` + `sharedDb`) |
| **Identity Provider** | Firebase Phone Authentication (`@react-native-firebase/auth`) |
| **Payments Gateway** | Razorpay (Server-side HMAC-SHA256 signature verification & Webhooks) |
| **Storage** | Supabase Storage (`profile-images`, `passenger-documents`) |

---

## 2. Architecture

```
                               ┌───────────────────────────────────┐
                               │           Mobile App              │
                               │      (Expo SDK 56 / TS / React)   │
                               │  Two API clients (Travel & Donor) │
                               └─────────────────┬─────────────────┘
                                                 │
                                Firebase Phone Authentication
                                                 │
                                     Firebase ID Token
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
       ┌───────────────────────┐                                 ┌───────────────────────────┐
       │  Travel & Seva Server │                                 │      Donation Server      │
       │     (Port 3000)       │                                 │        (Port 3001)        │
       │   Express + TS + PG   │                                 │      Express + MongoDB     │
       └───────────┬───────────┘                                 └─────────────┬─────────────┘
                   │                                                           │
                   ▼                                                           ▼
       ┌───────────────────────┐                                 ┌───────────────────────────┐
       │ Supabase PostgreSQL   │                                 │      MongoDB Databases    │
       │ users, travel_packages│                                 │  mainDb: User, Donation   │
       │ bookings, passengers  │                                 │  sharedDb: DonationHead   │
       │ seva_bookings, etc.   │                                 └───────────────────────────┘
       └───────────────────────┘
```

### Frontend Architecture
- **Navigation & Routing**: File-based routing via `expo-router` under `app/`. Auth-gated groups (`(auth)`, `(tabs)`).
- **State Management**: Zustand stores (`useAuthStore`, `useSevaStore`, `useBookingStore`) managing local reactive state and session hydration.
- **API Clients**: Two isolated Axios instances:
  1. `api` (`src/api/axiosClient.ts`): Communicates with the Travel/Seva Backend. Attaches the Travel JWT.
  2. `donationApi` (`src/api/donationAxiosClient.ts`): Communicates with the Donation Backend. Attaches the Donation JWT.
- **Dynamic Config**: Base URLs dynamically resolve via `src/utils/config.ts` (`process.env.EXPO_PUBLIC_API_BASE_URL` or Metro `hostUri` in `__DEV__`).

### Backend Architecture
- **Travel & Seva Backend** (`backend/src`): Express server exposing REST APIs for travel packages, bookings, seva sponsorships, push notifications, and user profiles. Connects to Supabase via `@supabase/supabase-js` using service role keys for admin data access.
- **Donation Backend**: Express server handling donation causes, donation order creation, collector KYC, and referral leaderboards using Mongoose connections.

### Authentication Flow
1. **Phone OTP Verification**: Devotee verifies phone number using Firebase Phone Authentication.
2. **Token Exchange**: The client retrieves the Firebase ID Token and exchanges it independently with both backends:
   - `POST /api/auth/verify-firebase-token` (Travel Backend) $\rightarrow$ Returns Travel JWT + user profile.
   - `POST /api/auth/verify-token` (Donation Backend) $\rightarrow$ Returns Donation JWT + user profile.
3. **Session Hydration**: App layout (`app/_layout.tsx`) initializes session on startup. A 4-second safety race guard ensures `setHydrated(true)` executes cleanly even if offline or under slow networks.
4. **Onboarding Gate**: If `user.fullName` is empty upon authentication, the user is redirected to `/edit-profile?onboarding=1`.

### Database Architecture
- **PostgreSQL (Supabase)**: Single relational source of truth for travel packages, multi-passenger bookings, passenger identity documents, seva date sponsorships, push notifications, and payment transactions.
- **MongoDB**: Document database backing donations, donation causes/heads, and collector profiles.

### Payment Flow
1. **Order Creation**: Client calls `POST /api/payments/create-order` (or `/api/payments/create-seva-order` / `/api/donations/create-order`). Backend computes total amount on the server and generates a Razorpay Order ID.
2. **Client Checkout**: Native app launches Razorpay Checkout modal.
3. **Server Verification**: Upon payment completion, client submits `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to `POST /api/payments/verify` (or `/verify-seva`).
4. **HMAC Signature Check**: Backend verifies signature using `crypto.createHmac('sha256', secret)`.
5. **Atomic Execution**: Successful verification triggers atomic PostgreSQL functions (`capture_booking_payment` & `mark_booking_paid_and_decrement_seats`), updating status to `paid` and decrementing remaining package seats in a single transaction. Webhooks provide fallback reconciliation with deduplication via `razorpay_webhook_events`.

### Notification Flow
- Push notification tokens (`push_token`) register to `users.push_token` via `registerPushToken()`.
- System events (booking confirmation, seva approval, identity verification status updates) record to the `notifications` table in PostgreSQL.
- App fetches user notifications via `GET /api/notifications` with unread badge indicators.

---

## 3. Feature Modules

### Authentication & Onboarding
- Phone OTP login backed by Firebase Auth.
- Automated creation/fetch of user profile in Supabase `users` table with explicit server-side UUID generation (`crypto.randomUUID()`).
- Onboarding enforced for users with incomplete profiles (`fullName` blank).
- **Navigation & Guard Rules**:
  - `useProtectedRoute` uses `router.replace({ pathname: '/(auth)/login', params: { returnTo: pathname } })` so unauthenticated protected routes are never left in the history stack underneath Login.
  - Login back button (`handleBack`) returns directly to `/(tabs)/home` in a single back action when exiting an unauthenticated redirect.
  - Signing out from the Profile screen explicitly navigates to `/(tabs)/home` as a guest before clearing session state, preventing unwanted redirection to the Login page.

### User Profile & Identity Verification
- Profile management (name, email, profile image upload to Supabase Storage `profile-images` bucket).
- Identity verification (Aadhaar number + Aadhaar document photo + selfie photo upload to `passenger-documents` bucket).
- Account soft deletion (`DELETE /api/users/me` sets `deleted_at = NOW()`).

### Travel Packages & Dynamic Option Pricing
- Live travel package listings fetched directly from Supabase `travel_packages`.
- **Zero Mock Pricing**: Package pricing matrix is fully dynamic and stored per package in Supabase:
  - `price`: Base package price.
  - `flight_price`: Flight add-on surcharge.
  - `train_ac_price`: 3AC Train add-on surcharge.
  - `train_non_ac_price`: Non-AC Train add-on surcharge.
  - `room_ac_price`: AC Room upgrade surcharge.
  - `room_non_ac_price`: Non-AC Room surcharge.
- Automatic capacity calculation with `total_seats` and `remaining_seats`.

### Travel Booking Pipeline
- Multi-traveler support (`booking_passengers` table).
- Lead traveler data prefilled from user profile.
- Live client-side unit price calculation (`basePrice + transportAddon + roomAddon`) with live choice badges (`+₹10,000`).
- **Server-Side Total Re-validation**: Backend recalculates option prices directly from `travel_packages` table during booking creation to guarantee tamper-proof total amounts.
- Seat reservation locks booking for 15 minutes (`expires_at`). Unpaid expired bookings are automatically cleaned up by `expire_stale_bookings()`.

### Seva Booking & Dynamic Calendar Availability
- Devotees sponsor full-day Mahaprasad (Annadan - ₹2,100) or Katha Sponsorship (Yajman - ₹5,100).
- **Real-Time Calendar Availability**: Availability is fetched dynamically from the database using `GET /api/seva/availability?type=annadan&month=2026-07`.
- Backend counts confirmed/pending bookings (`paid`, `payment_pending`) for each date, compares against daily configured capacity (`SEVA_CAPACITY_ANNADAN`, `SEVA_CAPACITY_YAJMAN`), and returns date-keyed availability:
  ```json
  {
    "2026-07-20": { "booked": 1, "capacity": 100, "remaining": 99, "available": true },
    "2026-07-21": { "booked": 100, "capacity": 100, "remaining": 0, "available": false }
  }
  ```
- Fully booked dates are automatically disabled on the interactive calendar.

### Donations & 80G Receipts
- Browsable donation causes/heads backed by MongoDB (`DonationHead`).
- Support for guest and authenticated donations.
- Automatic generation of 80G compliant tax receipts with downloadable PDFs.
- Automatic guest-to-account linking by phone number match upon subsequent login.

### Payments & Order Life Cycle
- Integrated Razorpay checkout flow.
- Server-side signature verification enforcing zero client trust.
- Payment idempotency: Duplicate payment verification requests return existing status safely without double-charging or duplicate seat decrements.

### Receipts & Documentation
- Built-in PDF/Modal receipt viewers for Travel bookings, Seva bookings, and 80G Donations.
- Native sharing via `Share.share()` for booking references and payment receipts.

### Notifications System
- Database-backed user notifications table (`notifications`).
- Supports mark-as-read (`PATCH /api/notifications/:id/read`) and mark-all-read (`PATCH /api/notifications/read-all`).

### Collector Program
- Displayed on the Homepage grid for all users (guests and authenticated). Tapping as a guest redirects to Login with `returnTo: '/collector-apply'`.
- Referral attribution via unique referral codes (`referralCode`).
- Collector KYC submission (`POST /api/collector/apply`).
- Dashboard statistics, top collectors leaderboard, and total donation referral tracking.

### Health & Diagnostics API
- Production health check endpoint: `GET /health`.
- Returns server uptime, current timestamp, environment mode, and active database connection check:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-07-22T19:56:00.000Z",
    "uptimeSeconds": 14205,
    "environment": "production",
    "database": {
      "status": "connected",
      "latencyMs": 12
    }
  }
  ```

---

## 4. API Endpoints Reference

### Travel & Seva Backend (Express + Supabase PostgreSQL)

#### Public Endpoints
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Production health check & database latency check |
| `GET` | `/api/packages` | List active travel packages with remaining seats & option pricing |
| `GET` | `/api/packages/:id` | Get details for a specific travel package |
| `GET` | `/api/seva/pricing` | Fetch dynamic Seva prices (Annadan & Yajman) |
| `GET` | `/api/seva/availability` | Fetch month-wise Seva date availability (`?type=annadan&month=YYYY-MM`) |
| `GET` | `/api/seva/:type/availability` | Fetch single-date or monthly availability for Seva |
| `POST` | `/api/auth/verify-firebase-token` | Exchange Firebase ID token for Travel JWT |
| `POST` | `/api/payments/webhook` | Razorpay webhook listener (deduplicated) |

#### Protected Endpoints (Requires `Authorization: Bearer <Travel_JWT>`)
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/users/me` | Fetch authenticated user profile |
| `PUT` | `/api/users/me` | Update user profile (name, image) |
| `POST` | `/api/users/upload-profile-image` | Upload user avatar image |
| `POST` | `/api/users/verify-identity` | Submit Aadhaar & selfie identity verification |
| `DELETE` | `/api/users/me` | Soft delete user account |
| `GET` | `/api/bookings` | List user's travel bookings |
| `POST` | `/api/bookings` | Create new multi-traveler booking & lock seats |
| `GET` | `/api/bookings/:id` | Get booking details with passenger breakdown |
| `POST` | `/api/bookings/:id/cancel` | Cancel an unpaid or pending travel booking |
| `POST` | `/api/payments/create-order` | Create Razorpay order for travel booking |
| `POST` | `/api/payments/verify` | Verify Razorpay payment signature & confirm booking |
| `GET` | `/api/seva/history` | List user's past Seva bookings |
| `POST` | `/api/seva` | Create a new Seva booking |
| `POST` | `/api/payments/create-seva-order` | Create Razorpay order for Seva booking |
| `POST` | `/api/payments/verify-seva` | Verify Razorpay signature & confirm Seva booking |
| `GET` | `/api/notifications` | List user notifications |
| `PATCH` | `/api/notifications/:id/read` | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Mark all user notifications as read |

---

### Donation Backend (Express + MongoDB)

#### Public Endpoints
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/donation-heads` | List active donation causes/heads |
| `GET` | `/api/collector/leaderboard` | Top collectors public leaderboard |
| `POST` | `/api/auth/verify-token` | Exchange Firebase ID token for Donation JWT |
| `POST` | `/api/donations/create` | Create a donation (Guest or Authenticated) |
| `POST` | `/api/donations/webhook` | Razorpay webhook listener for donations |

#### Protected Endpoints (Requires `Authorization: Bearer <Donation_JWT>`)
| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/donations/my-donations` | List user's donation history |
| `POST` | `/api/donations/create-order` | Create Razorpay order for donation |
| `GET` | `/api/donations/:id/receipt` | Download 80G donation receipt |
| `GET` | `/api/collector/dashboard` | Fetch collector performance stats |
| `POST` | `/api/collector/apply` | Submit collector KYC application |

---

## 5. Database Schema Reference

### PostgreSQL (Supabase) Schema

#### `users` Table
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    profile_image_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'not_submitted',
    aadhaar_number TEXT,
    aadhaar_image_path TEXT,
    selfie_image_path TEXT,
    push_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

#### `travel_packages` Table
```sql
CREATE TABLE public.travel_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC NOT NULL,
    duration TEXT NOT NULL,
    total_seats INTEGER NOT NULL,
    remaining_seats INTEGER NOT NULL,
    image_url TEXT,
    inclusions TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date DATE,
    end_date DATE,
    flight_price NUMERIC NOT NULL DEFAULT 0,
    train_ac_price NUMERIC NOT NULL DEFAULT 0,
    train_non_ac_price NUMERIC NOT NULL DEFAULT 0,
    room_ac_price NUMERIC NOT NULL DEFAULT 0,
    room_non_ac_price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `bookings` Table
```sql
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    package_id UUID NOT NULL REFERENCES public.travel_packages(id),
    status TEXT NOT NULL DEFAULT 'payment_pending',
    traveler_count INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC NOT NULL,
    base_amount NUMERIC NOT NULL,
    payable_amount NUMERIC NOT NULL,
    gateway_fee NUMERIC NOT NULL DEFAULT 0,
    transport_mode TEXT NOT NULL,
    room_type TEXT NOT NULL,
    bus_seat_numbers TEXT[],
    lead_traveler_name TEXT NOT NULL,
    lead_traveler_phone TEXT NOT NULL,
    lead_traveler_email TEXT,
    lead_traveler_address TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `booking_passengers` Table
```sql
CREATE TABLE public.booking_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    passenger_index INTEGER NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    full_name TEXT NOT NULL,
    dob DATE,
    gender TEXT NOT NULL DEFAULT 'other',
    phone TEXT,
    address TEXT,
    aadhaar_number TEXT,
    verification_status TEXT NOT NULL DEFAULT 'not_submitted',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `seva_bookings` Table
```sql
CREATE TABLE public.seva_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    seva_type TEXT NOT NULL, -- 'annadan' | 'yajman'
    seva_date DATE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'payment_pending',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `payments` Table
```sql
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id),
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    gateway_fee NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `notifications` Table
```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### MongoDB Schema

- **`User` (`mainDb`)**: `fullName`, `email`, `mobile`, `role` (`USER`/`COLLECTOR_PENDING`/`COLLECTOR_APPROVED`), `referralCode`, `collectorProfile` (`kycStatus`, `aadhaarNumber`, `aadhaarFrontUrl`).
- **`Donation` (`mainDb`)**: `user`, `collectorId`, `donor` (`name`, `mobile`, `pan`), `donationHead` (`id`, `name`), `amount`, `status`, `receiptNumber`, `receiptUrl`.
- **`DonationHead` (`sharedDb`)**: `key`, `name`, `description`, `imageUrl`, `minAmount`, `presetAmounts`, `is80GEligible`, `isActive`.

---

## 6. Security Implementation

### Firebase & Dual JWT Token Model
- Firebase Auth handles primary mobile identity.
- Client exchanges Firebase ID tokens with respective backends to receive domain-specific JWTs.
- Travel JWTs are signed with `JWT_SECRET` and validated by Express middleware `authenticateToken`.
- Donation JWTs are signed separately and validated by Donation Backend middleware.

### Razorpay Signature & Idempotency
- Signature Verification: HMAC-SHA256 signature verification executes server-side:
  ```ts
  const expected = crypto.createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  if (expected !== signature) throw new HttpError(400, 'Invalid signature');
  ```
- Duplicate Payment Protection: Payment verification endpoints check if the order/booking is already marked `paid`. If already processed, it responds immediately with success without re-executing seat decrements or database mutations.

### Ownership & Data Isolation
- Users can only fetch and update their own bookings, profiles, and notifications (`WHERE user_id = req.user.id`).
- Admin routes explicitly verify `req.user.role === 'admin'`.

### Seat Lock & Booking Expiry
- When a booking is created, seats are temporarily soft-reserved and `expires_at` is set to `NOW() + INTERVAL '15 minutes'`.
- PostgreSQL stored procedure `expire_stale_bookings()` automatically frees seats for unpaid bookings past their expiration time.

### Rate Limiting & Input Validation
- Express API endpoints apply standard JSON payload constraints and type validation.
- All monetary amounts and traveler counts are validated server-side to prevent parameter tampering.

---

## 7. Production Deployment & Infrastructure

### Health Monitoring
- Health endpoint `GET /health` is monitored continuously.
- Checks API responsiveness and executes a `SELECT 1` ping against Supabase PostgreSQL to verify DB health.

### Environment Variables

#### Travel Backend (`backend/.env`)
```env
PORT=3000
NODE_ENV=production
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
JWT_SECRET=<strong-random-jwt-secret>
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
RAZORPAY_WEBHOOK_SECRET=<your-razorpay-webhook-secret>
SEVA_CAPACITY_ANNADAN=100
SEVA_CAPACITY_YAJMAN=50
ANNADAN_SEVA_PRICE=2100
YAJMAN_SEVA_PRICE=5100
```

#### Frontend (`.env.production`)
```env
EXPO_PUBLIC_API_BASE_URL=https://api.mavt.in
EXPO_PUBLIC_DONATION_API_BASE_URL=https://api.mavt.in
EXPO_PUBLIC_SUPABASE_URL=https://jpvowbxojdvrpgtpxvmo.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_rjOY7F_gXhf7ZL6bLnhOtg_yiDlJ1s6
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_test_SxD6T0TWVN7G3r
```

### VPS, PM2 & Nginx Setup

#### Process Management (PM2)
Backends run under PM2 for automatic restart and cluster process management:
```bash
pm2 start dist/server.js --name "shri-gurudev-backend" --env production
pm2 save
```

#### Nginx Reverse Proxy Configuration
```nginx
server {
    server_name api.mavt.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/api.mavt.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mavt.in/privkey.pem;
}
```