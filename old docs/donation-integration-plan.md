# Donation backend integration plan

## Decision

Integrate the donation modules into the existing TypeScript/Express backend as one Node process:

- the existing Supabase client remains the travel backend's data client;
- a named Mongoose connection `mainDb` will own donation `User` and `Donation` models;
- a named Mongoose connection `sharedDb` will own `DonationHead`;
- existing travel routes keep their current Supabase JWT contract;
- donation/collector routes keep a separate Mongo backend JWT contract;
- the Razorpay webhook remains mounted before global JSON parsing with a route-scoped raw-body parser.

This avoids two public services and duplicated CORS/gateway configuration while keeping database clients, models, pools, and auth contracts isolated. It does not make Supabase and Mongo identities interchangeable.

## Route map

The merged backend will expose the donation API at the same paths used by the existing website/backend:

- `/api/donations`
- `/api/public/donation-heads*`
- `/api/public/referral/:code`
- `/api/referral`
- `/api/leaderboard`
- `/api/collector`
- `/api/webhooks/razorpay`
- `/api/auth/verify-firebase-token` and related donation auth endpoints
- `/api/user/donations` and donation-related profile endpoints
- `/api/admin/system/*` and `/api/admin/website/donation-heads*`
- `/receipts`

Existing travel routes remain `/api/bookings`, `/api/payments`, and `/api/users`.

## Database coexistence

Environment names are intentionally distinct:

- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`/`SERVICE_ROLE_KEY`.
- Donation Mongo main connection: `MONGO_URI`.
- Donation Mongo shared connection: `MONGO_URI_SHARED`.

`mainDb` and `sharedDb` must be created once at module load, connected once during server startup, and reused by all model operations. They must not use Mongoose's default global connection, and model registration must be connection-scoped to avoid model-name collisions. Supabase remains an independent HTTP client and does not share a pool with MongoDB.

Startup will validate Supabase and Razorpay configuration as it does today, then connect both Mongo clients before accepting requests. If donation Mongo configuration is absent in a travel-only environment, the server should fail clearly rather than silently registering incomplete donation routes.

## CORS and origin handling

The current backend does not configure CORS. The merged app will add a single CORS policy for the configured `FRONTEND_URL`, with `Authorization` and `Content-Type` allowed, and credentials enabled only if the existing deployment needs cookies. The policy applies uniformly to travel and donation routes because both are served by the same origin. Razorpay webhook requests are server-to-server and do not depend on frontend CORS.

## Auth identity decision

Supabase remains canonical for travel users because existing bookings, verification, and profile rows use Supabase UUIDs and the current `requireAuth` middleware calls `supabaseAdmin.auth.getUser`.

Donation users remain Mongo users because the imported donation models reference Mongo `User` documents and donation history filters by Mongo `Donation.user`. The donation JWT is separate and is never passed to travel routes; a Supabase JWT is never treated as a donation JWT.

The mobile app's Firebase Phone Authentication flow will exchange the Firebase ID token with both backends. The donation exchange will normalize the verified phone number, find/create the Mongo user, and issue the normal donation backend JWT. Historical guest donations can then be linked by the smallest safe change: when the donation user is known, update only donations with `user: null` and the same normalized donor mobile. This is a deliberate phone-based linkage rule, not an automatic merge of Supabase and Mongo identities.

## Dependency diff

Donation archive dependencies versus the existing root/backend package:

| Dependency | Existing app | Donation backend | Integration decision |
|---|---:|---:|---|
| `express` | `^5.2.1` | `^5.2.1` | No conflict. |
| `razorpay` | `^2.9.6` | `^2.9.6` | Reuse existing package/config. |
| `dotenv` | `^17.4.2` | `^17.2.3` | Reuse existing newer compatible version. |
| `multer` | `^2.1.1` | `^1.4.5-lts.1` | Keep existing v2; adapt upload code to current middleware/types. |
| `axios` | `1.16.1` | `^1.7.9` | No backend donation requirement; do not add a second version. |
| `bcrypt` | absent | `^6.0.0` | Not required by audited donation flow; do not add unless an imported admin path needs it. |
| `cookie-parser` | absent | `^1.4.7` | Not needed for bearer-token mobile integration. |
| `cors` | absent | `^2.8.5` | Add for the merged server's one CORS policy. |
| `express-rate-limit` | absent | `^8.2.1` | Add for the audited public/create/apply limits. |
| `firebase-admin` | absent | `^13.7.0` | Add for production Firebase ID-token verification; development bypass is gated separately. |
| `helmet` | absent | `^8.1.0` | Add as the merged server security middleware. |
| `jsonwebtoken` | absent | `^9.0.3` | Add for the separate donation backend JWT contract. |
| `mongoose` | absent | `^9.0.2` | Add for the two named Mongo connections. |
| `nodemailer` | absent | `^7.0.12` | Add because successful donations may send receipts. |
| `pdfkit` | absent | `^0.17.2` | Add for receipt generation. |
| `sharp` | absent | `^0.33.2` | Add only if imported donation-head/KYC image processing requires it. |
| `uuid` | absent | `^13.0.0` | Add only for imported upload/storage helpers that require it. |
| `firebase.json` | absent | required by archive code | Never commit a real service account; load from a deployment-only path/env and provide a clearly gated local mock only if needed. |

The root project already contains client-side `axios`, but new Expo data fetching should follow the repository's existing API conventions and the Expo data-fetching guidance; this backend integration does not require adding another client dependency.

## Environment inventory

Already present in `backend/.env.development`: `PORT`, Supabase settings, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.

Required additions for the merged donation backend:

- `MONGO_URI`
- `MONGO_URI_SHARED`
- `JWT_SECRET`
- donation email settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`
- `FRONTEND_URL`
- Firebase Admin service-account configuration. The archive's `src/config/firebaseAdmin.js` requires `src/config/firebase.json`, but the archive does not contain that secret file. Production must inject it securely; no fake production credential will be committed.

No Firebase Admin secret belongs in the Expo app or an `EXPO_PUBLIC_` variable.

## Runtime-only storage

Do not port the archive's `private_storage/` or `uploads/` contents. Keep only empty, ignored runtime directories with `.gitkeep` if the imported receipt/KYC/image code needs them. Receipts need a writable `receipts/` directory; KYC storage needs the equivalent empty private directory. Live uploads and KYC documents must remain deployment data, not source.

## Required hardening before route exposure

1. `create-order` must accept only a `PENDING` donation, verify ownership when a donation JWT is present, and reuse an existing Razorpay order for the same donation.
2. `create` must resolve the selected donation head against active `DonationHead` data and store the canonical key/name snapshot. Invalid or inactive causes must be rejected.
3. Donation webhook processing must remain raw-body based, signature verified, and idempotent for duplicate `payment.captured`/`payment.failed` deliveries.

