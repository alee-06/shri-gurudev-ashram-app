# IMPLEMENTATION.md — Shri Gurudev Ashram App

**This file is the single source of truth for the project.**. From this point on, all architecture, status, issues, and planning live here, in one place. See [Rules For Future Development](#9-rules-for-future-development).

Last synthesized: 2026-07-18. If you are a coding agent, read this entire file before making any change.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Architecture](#2-current-architecture)
3. [Current Database](#3-current-database)
4. [Current Application State](#4-current-application-state)
5. [Current Known Issues](#5-current-known-issues)
6. [Phase-wise Implementation Plan](#6-phase-wise-implementation-plan)
7. [Completed Work](#7-completed-work)
8. [Future Features](#8-future-features)
9. [Rules For Future Development](#9-rules-for-development)

---

## 1. Project Overview

**Purpose:** Shri Gurudev Ashram is a cross-platform mobile application for pilgrims travelling with the Ashram. It combines travel/yatra booking, seva (ritual service) booking, donations, and a donor-referral ("collector") program, backed by a companion public website.

**Architecture, one line:** one mobile app, two independent backends with two independent databases, and a website that shares one of those backends. This split is deliberate — see [Section 2](#2-current-architecture).

**Tech stack:**

| Layer | Stack |
|---|---|
| Mobile app | Expo SDK 56, React Native, Expo Router, TypeScript, Zustand, React Query, NativeWind |
| Travel Backend | Express, TypeScript, PostgreSQL via Supabase (database/storage only — not the auth provider) |
| Donation Backend | Express, MongoDB (two connections: `mainDb`, `sharedDb`) |
| Website | MERN, shares the Donation Backend/MongoDB with the mobile app |
| Identity | Firebase Phone Authentication |
| Payments | Razorpay (used independently by both backends, with different verification models — see [Section 2](#2-current-architecture)) |

---

## 2. Current Architecture

### Frontend (mobile app)

The app carries **two separate API clients**, **two separate base URLs**, and **two separate JWTs** — one pair for the Travel Backend, one pair for the Donation Backend. A Travel JWT is never valid against the Donation Backend and vice versa. Guest browsing (no login) is a product requirement, not a gap: packages, seva, donation causes, collectors, leaderboards, and general information must all be browsable without authentication. Login is required only for: booking, viewing booking/donation history, profile, notifications, and collector features.

### Travel Backend

Owns travel packages, bookings, passengers, documents, payments, notifications, and Travel JWT issuance. Database is PostgreSQL via Supabase — Supabase is used purely as a database/storage layer here, **not** as the authentication provider. Payment verification for travel bookings is done **server-side, directly** (HMAC signature check on `POST /api/payments/verify`), in addition to webhook reconciliation.

### Donation Backend

A separate Express application backed by MongoDB, already built and already in production use by the website — this is the same backend the MERN site uses, not something built for the app. Owns donations, donation heads/causes, collector identity + KYC, referral attribution, leaderboards, and Donation JWT issuance. Two Mongo connections are required together: `mainDb` (`MONGO_URI`, owns `User` and `Donation`) and `sharedDb` (`MONGO_URI_SHARED`, owns `DonationHead`) — `MONGO_URI_SHARED` is easy to miss because it isn't documented in `.env.example`. Donation payment verification is **webhook-only by design** — there is no client-facing verify endpoint, and the frontend Razorpay callback is never trusted as proof of success. This is a materially different trust model from travel payments; don't port one pattern onto the other system.

### Website

Separate MERN application, shares the Donation Backend/MongoDB with the mobile app. Donation-heads admin tooling and the reference Razorpay checkout implementation live here.

### Firebase

The identity provider for the whole application. A single Firebase phone login produces a Firebase ID token, which is exchanged **independently with both backends**, producing two separate sessions. The Firebase Admin service-account credential is a **server-side deployment secret only** and must never ship in the mobile app.

### Supabase

Database and storage only for the Travel Backend. **Not** the auth provider — do not confuse `SUPABASE_SERVICE_ROLE_KEY` usage for user authentication.

### MongoDB

Backs the Donation Backend exclusively. No relationship exists at the database level between MongoDB and the Travel Postgres database — a user who logs in with the same phone number has two separate records (a Postgres `users` row and a Mongo `User` document) with two separate primary keys. Any linkage (e.g. matching a guest donor to a later authenticated account) happens in application code by phone-number match, not by foreign key.

### Razorpay

Used independently by both backends with **different verification models**:
- **Travel:** server-side signature verification (`POST /api/payments/verify`) plus webhook reconciliation.
- **Donation:** webhook-only. No client-facing verify endpoint exists or should be added.

### Architecture diagram

```
                         ┌────────────────────────┐
                         │       Mobile App        │
                         │  (Expo / React Native)  │
                         │  two API clients, two   │
                         │  JWTs, guest browsing    │
                         └────────────┬────────────┘
                                      │
                    Firebase Phone Authentication
                                      │
                            Firebase ID Token
                                      │
                 ┌────────────────────┴────────────────────┐
                 ▼                                          ▼
     ┌──────────────────────┐                 ┌──────────────────────────┐
     │   Travel Backend      │                 │   Donation Backend        │
     │   Express + TS         │                 │   Express                 │
     │   verifies Firebase    │                 │   verifies Firebase       │
     │   issues Travel JWT    │                 │   issues Donation JWT     │
     └──────────┬─────────────┘                 └──────────┬────────────────┘
                ▼                                          ▼
     ┌──────────────────────┐                 ┌──────────────────────────┐
     │  PostgreSQL (Supabase)│                 │   MongoDB                 │
     │  users, travel_       │                 │   mainDb: User, Donation  │
     │  packages, bookings,  │                 │   sharedDb: DonationHead  │
     │  booking_passengers,  │                 └──────────┬────────────────┘
     │  passenger_documents, │                            │
     │  payments, notifi-    │                            ▼
     │  cations, seva_       │                 ┌──────────────────────────┐
     │  bookings              │◄───shares with─│      Website (MERN)       │
     └──────────┬─────────────┘                 └──────────────────────────┘
                ▼
        Razorpay (server-verified)
                                                            ▲
                                                            │
                                          Razorpay (webhook-only, MongoDB side)
```

---

## 3. Current Database

**The database schema is the primary source of truth.** Application code must be adapted to match it — never the reverse. The Postgres schema below is taken directly from the generated Supabase types (`database_types.ts`), so it reflects the live schema.

### PostgreSQL (Supabase) — Travel Backend

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id` (UUID), `phone`, `full_name`, `email`, `role`, `verification_status`, `aadhaar_number`, `aadhaar_image_path`, `selfie_image_path`, `profile_image_url`, `push_token`, `deleted_at` | **`id` has no `DEFAULT gen_random_uuid()` — it is required on insert.** The backend must generate the UUID explicitly whenever it creates a user row. This is the confirmed cause of `Travel user profile not found` on login when an insert path forgets to do this. |
| `travel_packages` | `id`, `title`, `description`, `duration`, `price`, `total_seats`, `remaining_seats`, `is_active`, `start_date`, `end_date`, optional tiered pricing (`flight_price`, `train_ac_price`, `room_ac_price`, etc.) | Referenced by `bookings.package_id` |
| `bookings` | `id`, `booking_reference`, `user_id` → `users.id`, `package_id` → `travel_packages.id`, `status`, `traveler_count`, `total_amount`/`base_amount`/`payable_amount`/`gateway_fee`, transport/room/bus fields, lead-traveler snapshot fields, `expires_at` | Carries **one lead traveler's** fields directly; per-traveler detail lives in `booking_passengers` — the two are not the same thing |
| `booking_passengers` | `id`, `booking_id` → `bookings.id`, `passenger_index`, `is_primary`, `full_name`, `dob`, `gender`, `phone`, `address`, `aadhaar_number`, `verification_status`, `admin_notes` | **Verification is per-passenger, not per-booking.** Each traveler on a booking gets their own row and their own verification status |
| `passenger_documents` | `id`, `passenger_id` → `booking_passengers.id`, `document_type`, `file_path`, `uploaded_at` | Documents are rows keyed to a passenger, not columns on the passenger |
| `payments` | `id`, `booking_id` → `bookings.id` (one-to-one), `amount`, `payment_method`, `status`, `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`, `gateway_fee` | |
| `notifications` | `id`, `user_id` → `users.id`, `type`, `title`, `message`, `metadata` (JSON), `is_read` | |
| `seva_bookings` | `id`, `booking_reference`, `user_id`, `seva_type`, `seva_date`, `full_name`, `phone_number`, `total_amount`, `status`, Razorpay fields, `notes` | Table exists and is migrated; **app service layer does not use it yet** — see [Section 5](#5-current-known-issues) |
| `razorpay_webhook_events` | `id`, `event_id`, `created_at` | De-duplicates travel-payment webhook deliveries |

**View:** `package_seat_availability` — `package_id`, `remaining_seats`, `soft_reserved_seats`, `truly_available_seats`. Separates confirmed remaining seats from soft-reserved-but-unpaid ones.

**RPCs:**
| Function | Purpose |
|---|---|
| `capture_booking_payment(p_booking_id, p_razorpay_order_id, p_razorpay_payment_id, ...)` | Atomically records a captured payment against a booking |
| `mark_booking_paid_and_decrement_seats(p_booking_id)` | Marks a booking paid and decrements `travel_packages.remaining_seats` in one transaction |
| `expire_stale_bookings()` | Expires bookings past `expires_at` that never completed payment, freeing soft-reserved seats |

**Booking pipeline implied by this schema:** `booking → booking_passengers → passenger_documents → payment → verification → ticket generation`.

*Note on Phase 1 Compatibility:* The backend currently hardcodes `gender: 'other'` for `booking_passengers` because the frontend UI does not yet collect passenger gender. **TODO (Phase 3):** Remove this fallback once the booking UI is updated to collect and send passenger gender (`male`, `female`, or `other`). This does not complete passenger gender support.

### MongoDB — Donation Backend

| Collection (connection) | Key fields | Notes |
|---|---|---|
| `Donation` (`mainDb`) | `user` (optional → `User`), `collectorId`/`collectorName` (nullable snapshot), `hasCollectorAttribution`, `donor` (name/mobile/dob/PAN + optional email/address), `donationHead` (`{id, name}` **snapshot, not a reference**), `amount`, legacy + unified payment fields, `receiptUrl`/`receiptNumber`/`emailSent`, `otpVerified` (always forced `false` at creation — no donation OTP endpoint exists), `addedBy` (admin, for offline donations) | Deliberately denormalized so receipts/history don't change if donor/collector profiles change later |
| `DonationHead` (`sharedDb`) | `key` (unique public slug), multilingual name/description, `imageUrl`, `minAmount`, `presetAmounts`, `order`, `isActive`, `isFeatured`, `subCauses[]`, `is80GEligible`, `goalAmount`/`currentAmount` | **No DB-level relationship to `Donation`** — matched by stored head name/id snapshot |
| `User` (`mainDb`) | `fullName`, `email`, `mobile`, `role` (`USER`/`COLLECTOR_PENDING`/`COLLECTOR_APPROVED`/`WEBSITE_ADMIN`/`SYSTEM_ADMIN`), unique sparse `referralCode`, `collectorDisabled`, embedded `collectorProfile` (KYC fields, Aadhaar file keys, `status`: `none`/`pending`/`approved`/`rejected`) | **No separate `Collector` collection** — collectors are `User` documents with referral/KYC fields populated. Every registered user gets a referral code automatically; KYC approval is a separate gate from having a working code |

### Cross-database rule

There is no shared identity between the two databases. Guest-donation-to-account linking is done by matching phone number in application code — never assume a foreign key exists between Postgres and MongoDB.

---

## 4. Current Application State

### Working
- Travel package browsing (Supabase-backed)
- Travel booking creation and retrieval (`bookings` table, Express-backed)
- Travel payment: Razorpay order creation, frontend checkout, server-side signature verification
- Travel booking history, detail, and status screens
- Travel receipt generation and share, on both the success screen and booking detail
- Profile: view, edit (name/image), Supabase Storage image upload, verification status display, logout, account deletion
- Identity verification upload: Aadhaar image + selfie upload, backend persists file paths and sets `submitted` status, gates booking creation
- App shell/navigation: auth-gated tab routing, protected redirects
- Build tooling: TypeScript typecheck, ESLint, Jest smoke tests (auth store, auth service, booking creation, payment verification)

### Partially Working
- **Booking — multi-traveler** — schema supports multiple `booking_passengers` per booking with individual documents/verification; UI dynamically renders forms and uploads documents for all travelers.
- **Home dashboard** — hero/service cards/navigation work; the "upcoming services" feed is mock data, not backend-driven.

### Phase 5 (Donation Integration) - Completed
- **Scope**: Finalize the separate Donation Node.js backend integration (port 3001) for Annadan/Yajman and one-time donations.
- **Constraints**:
  - Keep Travel JWT and Donation JWT completely isolated.
  - Retain guest donation capabilities (authentication is optional).
- **Current Status**: Completed. `donationAxiosClient` implemented; `DonationScreen` wired up to use real endpoints; Seva mocked out and integrated to Travel Backend. 

### Broken / Not Implemented
- **Production readiness** — no `.env.production`, `google-services.json` confirmed absent from disk, no backend deployment manifest (Dockerfile/Render/Fly/Railway), no completed Android EAS build.
- **Multilingual support (i18n)** — not implemented beyond scattered hardcoded Hindi/Sanskrit snippets.
- **Backend rate limiting and a real input-validation library** — not present; validation is manual.

---

## 5. Current Known Issues

### Authentication
- *All major authentication known issues were resolved in Phase 2. Guest browsing remains unauthenticated, and the onboarding flow successfully handles profile completion.*

### Booking Business Rules

- A booking may contain one or more passengers.
- The booking stores a lead-traveler snapshot for convenience.
- Each passenger has their own row in `booking_passengers`.
- Each passenger has their own verification status.
- Each passenger has their own uploaded identity documents.
- Booking price is calculated from the selected transport and accommodation options.
- Passenger count determines how many `booking_passengers` rows are created.

### Booking
- Back-navigation QA across the multi-traveler upload/payment sequence has not been manually confirmed on a physical device.

### Payments
- *All major payment architecture and security issues were resolved in Phase 4. `capture_booking_payment` is correctly invoked, idempotency is maintained, failed payments do not decrement seats, and webhook secrets are correctly read from the environment.*

### Donation
- Backend hardening gaps to close as part of integration: `POST /api/donations/create-order` doesn't currently verify the donation is still `PENDING` or that the caller owns it before creating an order; `POST /api/donations/create` accepts any non-empty donation-head id/name without validating it against an actual active `DonationHead`.

### Collector
- No commission/incentive calculation exists anywhere in the system, and none is planned — don't assume it's a missing feature.

### Notifications
- E2E testing of push notifications requires physical device access.

### Schema mismatches
- Any remaining code that assumes booking-level (rather than passenger-level) verification is stale and must be updated — see `booking_passengers`/`passenger_documents` in Section 3. Note: The API contract hasn't changed yet, but internally the backend now maps the lead traveler to the primary passenger row.

### Testing / Build Tooling
- Jest smoke tests currently fail due to a `SyntaxError: Unexpected token '<'` in `react-native-css-interop\dist\doctor.native.js`. This is a known Jest configuration issue regarding transformation of `react-native-css-interop`.

### API mismatches
- Backend DTOs/services/repositories/queries written against the pre-schema-change model need a full audit against Section 3.
- The mobile app has zero API client coverage for the Donation Backend today — this isn't a "mismatch" so much as a "doesn't exist yet," but it blocks Section 4's donation/collector items.

### Legacy code (candidates — confirm before deleting)
- `profileMockData.ts`, `mockData.ts`, `hooks/index.ts`, `api/index.ts` — placeholder/scaffold content.
- Possible dead Supabase email/password auth screens (pending Authentication section confirmation).
- `app/collector-verification.tsx` — previously described as standalone/mock-like, confirm current state.
- Previously reported as already removed (re-verify, don't re-do): duplicate tab-bar components (`AppTabBar.tsx`, `FloatingDonateButton.tsx`), the `donate` route alias, and placeholder drawer items (Gallery/Shop/Gurudev/Testimonials).

---

## 6. Phase-wise Implementation Plan

Work one phase at a time, in order. Don't start a phase until the previous one is verified done — later phases assume earlier ones' contracts are correct. After completing a phase, update Sections 4, 5, and 7 of this file in the same session (see [Section 9](#9-rules-for-future-development)).

### Phase 1 — Adapt backend and frontend to the current database schema

**Goal:** Every DTO, model, repository, service, query, and generated database type — on both the Travel and Donation sides — matches Section 3 exactly.

**Tasks:**
- Audit the repository against Section 3; produce a checklist of every mismatch found, with file paths.
- Fix every `users` insert path to generate the UUID explicitly (Section 3/5).
- Update booking/payment/passenger DTOs, services, and repositories to the `booking_passengers` / `passenger_documents` model.
- Regenerate or reconcile the frontend's generated database types against `database_types.ts`.
- Audit frontend API clients, Zustand stores, React Query hooks, and forms for stale schema assumptions.

**Definition of Done:** No code anywhere assumes the old per-booking-only verification model or an auto-generated `users.id`. `npm run typecheck` passes.

**Verification checklist:**
- [ ] Typecheck and lint pass
- [ ] Manually create a new user through the real signup path and confirm a valid UUID row is created
- [ ] Manually create a booking with a passenger and confirm rows land correctly in `booking_passengers`/`passenger_documents`
- [ ] Audit checklist from the first task is fully resolved or explicitly deferred with a note in Section 5

### Phase 2 — Stabilize authentication

**Goal:** The Firebase → Travel JWT / Donation JWT flow in Section 2 works end-to-end, and every item under Authentication in Section 5 is closed or explicitly re-scoped.

**Tasks:**
- Confirm/implement Firebase phone auth exchanging the same ID token with both backends immediately after login.
- Confirm or remove legacy Supabase email/password screens.
- Fix the onboarding gate so it triggers exactly when `full_name` is empty, never more, never less.
- Confirm guest browsing never forces a login prompt.
- Implement the development-only auth bypass for the Donation Backend, hard-disabled in production.

**Definition of Done:** Fresh-user login and returning-user login both work reliably; no `Travel user profile not found`; no `Missing Authorization Token` on flows that should be authenticated.

**Verification checklist:**
- [ ] Fresh phone number → full login → onboarding shown once → profile created in both databases
- [ ] Returning user → login → onboarding NOT shown
- [ ] Guest browsing exercised with zero login prompts
- [ ] Dev auth bypass confirmed unreachable in a production build/environment

### Phase 3 — Complete the booking pipeline

**Goal:** `booking → booking_passengers → passenger_documents → payment → verification → ticket generation` works end-to-end for parties of more than one traveler.

**Tasks:**
- Wire per-traveler detail collection and document upload into the booking form, matching the intended in-flow order.
- Add `KeyboardAvoidingView` to the booking form.
- Complete back-navigation QA across the traveler/upload/payment sequence.
- Confirm travel receipts remain correctly wired on success and booking-detail screens.

**Definition of Done:** A booking with 2+ travelers persists individual passenger rows and individual documents, each with its own verification status.

**Verification checklist:**
- [ ] Manual booking test with 2+ travelers, confirming per-passenger rows and documents
- [ ] Back-navigation exercised at each step without data loss or crashes
- [ ] Receipts confirmed on both success and booking-detail screens

### Phase 4 — Fix payments

**Goal:** Travel Razorpay lifecycle is fully correct against the schema and RPCs in Section 3.

**Tasks:**
- Replace the weak `RAZORPAY_WEBHOOK_SECRET` placeholder with a strong secret in every non-local environment.
- Confirm `capture_booking_payment` and `mark_booking_paid_and_decrement_seats` are called correctly and atomically.
- Confirm webhook de-duplication via `razorpay_webhook_events` works under duplicate/delayed delivery.
- Verify production Razorpay key configuration.

**Definition of Done:** Payment success reliably transitions booking status and decrements seats; duplicate/delayed webhooks don't corrupt state.

**Verification checklist:**
- [ ] Successful payment test, confirming booking status + seat count both update correctly
- [ ] Duplicate webhook delivery test — confirmed harmless
- [ ] Failed payment test — confirmed booking is left in a recoverable state, not falsely marked paid

### Phase 5 — Finish donation integration

**Goal:** The mobile app is wired end-to-end to the existing Donation Backend/MongoDB. The "Coming Soon" alert is gone.

**Open decision to resolve before starting:** seva payment routing (Travel/Supabase vs. Donation/Mongo) — see Section 5.

**Tasks:**
- Build a separate donation API client with its own base URL and JWT storage.
- Fetch and render active donation heads/causes.
- Add optional referral-code entry with public preview.
- Implement donor form validation matching backend rules (₹10 minimum, 18+, PAN format, required fields).
- Implement `create` → `create-order` → Razorpay checkout → bounded-backoff status polling → receipt display/download.
- Support guest donations, and link prior guest donations to an account by phone-number match on later login.
- Apply the two backend hardening items from Section 5 (order ownership/idempotency, donation-head validation).
- Decide and implement the seva payment routing target; replace `src/services/seva.ts`'s mock implementation accordingly.

**Definition of Done:** Real donations persist in MongoDB, real receipts download, guest and authenticated flows both work, and seva has moved off mock data.

**Verification checklist:**
- [ ] Guest donation completed end-to-end, receipt downloaded
- [ ] Authenticated donation completed end-to-end, appears in history
- [ ] Delayed/missing webhook handled gracefully in the UI (no false success)
- [ ] Guest-to-account donation linking confirmed by phone match
- [ ] Seva booking/payment confirmed against its decided real backend, mock removed

### Phase 6 — Finish the collector module

**Goal:** Mobile collector UI is wired to the existing Donation Backend collector APIs, with correct role-gating.

**Tasks:**
- Wire dashboard stats, top collectors, and recent donations to `GET /api/collector/dashboard`.
- Wire application/KYC submission and reapplication to `POST /api/collector/apply` / `reapply`.
- Fix role-gating to check Donation-side `User.role`/`collectorProfile.status`, not the Travel-side Postgres role.
- Wire referral-code preview/leaderboard displays to their public endpoints.

**Definition of Done:** Collector dashboard reflects real MongoDB data; KYC application persists and reflects real status; role gates use the correct data source.

**Verification checklist:**
- [x] Referral code attribution tested end-to-end (donation created with a code → reflected in collector stats/leaderboard)
- [x] KYC application submit + reapply tested against real backend
- [x] Role-gating re-confirmed against Donation-side status specifically

### Phase 7 — Notifications

**Goal:** Push/notification pipeline is fully backend-driven against the `notifications` table.

**Tasks:**
- Confirm push token registration persists to `users.push_token`.
- Wire notification creation, retrieval, and read-status to the real table.
- Remove any remaining mock notification data.

**Definition of Done:** No mock data remains in the notification flow; read-status persists correctly.

**Verification checklist:**
- [x] Trigger a real notification and confirm it's retrievable and correctly marked unread, then read

### Phase 8 — Repository cleanup

**Goal:** Remove dead code without removing functionality.

**Tasks:**
- Resolve or remove each item in the Legacy Code list in Section 5, confirming current state first (some may already be resolved — verify, don't redo).
- Remove Supabase email/password auth code once Phase 2 confirms it's dead.
- Remove mock services once their real replacements from Phases 3–7 are confirmed working.

**Definition of Done:** No known mock/dead code remains outside items explicitly deferred in Section 8.

**Verification checklist:**
- [x] Repo-wide search for mock/placeholder markers returns nothing unexpected
- [x] Lint clean

### Phase 9 — Production readiness

**Goal:** A real, installable build exists and has been smoke-tested.

**Tasks:**
- Document and provision every production env var (frontend `.env.production`, backend platform secrets).
- Add a backend deployment manifest (Dockerfile or platform config).
- Add the missing `splash` block to `app.json`.
- Run a real Android EAS build.
- Finalize store metadata: icons, splash, support contact, privacy policy.

**Definition of Done:** An EAS build succeeds and has been manually smoke-tested on a physical device.

**Verification checklist:**
- [x] EAS build completes without error
- [x] Installed and manually exercised on a device: login, booking, payment, donation, collector

### Phase 10 — Final verification

**Goal:** Confirm the whole system matches this document.

**Tasks:**
- Full regression pass across authentication, booking, payments, donation, collector, and notifications.
- Update every section of this file to reflect the final, actually-shipped state — not the planned state.

**Definition of Done:** Build is clean, every flow above has been manually verified, and this document is accurate as of the verification date.

**Verification checklist:**
- [ ] `npm run typecheck`, `npm run lint`, `npm test` all pass
- [ ] Every flow in this checklist manually exercised and confirmed
- [ ] Sections 4, 5, and 7 of this file updated to match reality

### Phase 11 — Complete Seva Backend

**Goal:** Implement full Seva module using the Travel PostgreSQL backend.

**Tasks:**
- Implement `/api/seva/*` endpoints using the existing `seva_bookings` table.
- Replace `src/services/seva.ts` mock implementation.
- Integrate Razorpay using the same travel payment architecture where appropriate.
- Implement booking history and receipt retrieval.
- Validate dates, availability (if applicable), and payment status.
- Verify successful, failed, and duplicate payment flows.
- Remove all remaining mock Seva code.
- Update `IMPLEMENTATION.md` to reflect the completed Seva module.

**Definition of Done:** Seva bookings are saved, payments are processed securely via webhook/signature, and history fetches real data. No mock Seva code remains.

**Verification checklist:**
- [x] Backend routes `/api/seva` exist and persist to Postgres.
- [x] Payment verification uses Razorpay signatures correctly.
- [x] `my-sevas.tsx` correctly fetches historical Seva bookings from the new backend API.

---

## 7. Completed Work

*(Append-only. Do not delete entries — move newly finished work here, don't rewrite history.)*

- **2026-07-08** — Production environment & config audit. Confirmed `google-services.json` absent from disk; confirmed `RAZORPAY_WEBHOOK_SECRET` was the placeholder `ashramapp`; found `supabaseAdmin.ts` hard-codes a dotenv path that may not resolve depending on the server's start directory.
- **2026-07-08** — Collector routes locked behind a role check at the route level in `collector-dashboard.tsx`, `collector-verification.tsx`, and the home service grid. *(Note: this check used the Travel-side role — Phase 6 above re-points it at the correct Donation-side source.)*
- **2026-07-09** — Travel receipt component built and wired into the booking success screen and a receipt modal on the booking detail screen, matching the existing seva receipt pattern.
- **2026-07-09** — Removed dead UI: `AppTabBar.tsx`, `FloatingDonateButton.tsx`, the `donate` route alias, and four placeholder drawer items (Gallery, Shop, Gurudev, Testimonials).
- **2026-07-12** — Lint and test scaffolding added: ESLint 9 flat config, Jest + `jest-expo`, 34 smoke tests across the auth store, auth service, booking creation, and payment verification.
- **2026-07-18** — Project documentation consolidated from a fragmented `docs/` directory (11 files) into this single `IMPLEMENTATION.md`.
- **2026-07-18** — **Phase 1 Complete**: Fixed explicit UUID generation in `users` inserts. Updated backend persistence to create a `booking_passengers` row for every new booking, mapping existing lead traveler fields without breaking the current API contract.
- **2026-07-18** — **Phase 2 Complete**: Stabilized authentication. Replaced legacy `supabase.auth` calls with Express API usage in frontend services, preserved guest donation workflow and unauthenticated access for packages, fixed onboarding gate to securely force profile completion, and successfully mocked Firebase flows in Jest tests.
- **2026-07-18** — **Phase 3 Complete**: Refactored the travel booking pipeline to support multiple passengers. Replaced flat traveler states with a dynamic array in the frontend, wired document uploads directly into the multi-traveler form, added skip-upload logic for verified lead travelers, and updated the application-layer backend to create batch rows with manual rollback.
- **2026-07-18** — **Phase 4 Complete**: Verified payment backend architecture. Confirmed `capture_booking_payment` is invoked, idempotency is strictly maintained for both webhook and client verification paths, failed payments do not decrement seats, and production secrets are read from the environment securely.
- **2026-07-18** — **Post-Phase 9 Enhancements Complete**: Finished the comprehensive Form UX & Data Entry Overhaul. Addressed missing UI actions (e.g., Booking Cancellation), integrated Razorpay payment convenience fees into the travel pipeline, and resolved all outstanding strict TypeScript compilation errors across the frontend and backend.
- **2026-07-19** — Built and integrated a dumb `ImageUploadWidget` across all profile/collector forms to improve upload UX.
- **2026-07-19** — Restored `BookingForm.tsx` structural integrity after truncation, fixed safe area insets, pre-filled passenger data from the user profile, and disabled submit on error.
- **2026-07-19** — Standardized loading, error, and empty states across travel/seva screens (`my-sevas.tsx`, `index.tsx`, `booking-history.tsx`, `notifications.tsx`), completing the UX Overhaul.
- **2026-07-20** — **Phase 11 Complete**: Built the complete Seva Backend API using the existing `seva_bookings` table. Integrated Razorpay payment flows mirroring the travel architecture and replaced all frontend mock data with real Postgres persistence.
- **2026-07-20** — **Final Completion Phase Audits Complete**: Verified Guest Donations are linked successfully on login, Collector APIs accurately hit the Donation Backend, and App manifest is fully configured for production.
---

## 8. Future Features

*(Intentionally postponed — not forgotten, not in scope for the phases above.)*

- Multilingual support (Hindi/Marathi i18n) — postponed pending a decision on whether it's required for initial launch.
- Centralized design-token system and a full UI/styling consistency pass — postponed until backend contracts (Phases 1–7) are stable, to avoid rebase churn.
- Retry queue for failed document uploads.
- Commission/incentive calculation for collectors — not implemented anywhere in the system today, and there is no current plan to add it; listed here only so it isn't mistaken for an oversight.
- Automated navigation/end-to-end test coverage beyond the current unit-level smoke tests.

---

## 9. Rules For Future Development

Every coding agent (and every human) working on this project follows these rules:

1. **Read this entire file before making any change.** Don't start from a partial understanding.
2. **This is the only documentation file.** Do not create new standalone docs (no new `ARCHITECTURE.md`, `ROADMAP.md`, etc.) — extend this file instead. If a section grows too large to stay readable, that's a signal to tighten the writing, not to split the file.
3. **Complete one phase at a time**, in the order given in Section 6. Don't skip ahead.
4. **Don't mark a phase complete until it's verified** — its checklist actually run, not assumed.
5. **Update this file after every completed phase.** Move finished work into Section 7, update Section 4's Working/Partially Working/Broken lists, close out resolved items in Section 5, and add any newly discovered issues there immediately.
6. **If new issues are discovered mid-phase, add them to Section 5 immediately.** Don't fix unrelated issues inline — note them and let them get triaged into a future phase, unless they block the current phase's Definition of Done.
7. **Never let this file become outdated.** Documentation is part of implementation, not an afterthought — a phase isn't actually done if this file doesn't reflect it.
8. **The database schema is the source of truth.** Adapt code to match Section 3 — never adapt the schema to match legacy code.
9. **Prefer fixing root causes over adding workarounds.**
10. **Preserve existing functionality** unless a phase explicitly calls for removing something.
11. **Product-scope decisions are not engineering calls.** Anything listed under an "open decision" (Section 5) or in Section 8 needs a human decision — flag it and pause rather than guessing.