# Pre-Launch Engineering Audit — Shri Gurudev Ashram App

**Auditor Role:** Principal Staff Engineer / Security Engineer / Senior QA Lead / Mobile UX Reviewer  
**Date:** 2026-07-20  
**Scope:** Full codebase — mobile app, travel backend, donation backend  

---

## 1. Executive Summary

This application has **significant unresolved security vulnerabilities, payment integrity gaps, and production configuration failures** that make it unfit for a production launch in its current state.

The most critical issues are:

1. **Secrets committed to version control** (database credentials, API keys, Firebase service account)
2. **No rate limiting on any endpoint** — trivially exploitable for seat exhaustion, donation spam, and OTP abuse
3. **Booking price is ignored from the server-side** — the payment amount uses `travelPackage.price` (from DB) instead of the preference-based `totalAmount` that was actually stored on the booking, leading to payment amount mismatches
4. **Donation payment verification is entirely webhook-dependent** with no client-side polling timeout or failure handling, and the donation status endpoint has **no authorization** — any user can query any donation's status and receipt
5. **The production `.env` files contain placeholder values** — the app literally cannot connect to any backend in a production build
6. **Supabase Admin client bypasses RLS** — while the backend uses `supabaseAdmin` (service role key), the RLS policies reference `auth.uid()` which will never match since Supabase auth is not used; this is architecturally correct but means all access control lives solely in Express middleware — a single middleware misconfiguration exposes the entire database
7. **No booking expiration mechanism is triggered** — `expire_stale_bookings` RPC exists in the schema but is never called anywhere in the application code

> **Recommendation: Do NOT launch.** Fix Critical and High issues first. Estimated remediation: 2–3 weeks of focused engineering.

---

## 2. Critical Issues

### C-01: Secrets Committed to Git Repository

**Severity:** Critical  
**Confidence:** High

**Why it is a problem:**  
[.env.development](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/.env.development) contains live Supabase service role key, Razorpay API keys, MongoDB credentials (with plaintext password `ashram123`), and a Firebase service account JSON file path. The `.gitignore` has `.env.*` which *should* exclude these, but the file physically exists on disk and may have been committed before the gitignore was added. The [firebase-service-account.json](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/firebase-service-account.json) file (2.4KB) is NOT in `.gitignore` and is committed.

**Files involved:**
- [backend/.env.development](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/.env.development)
- [backend/firebase-service-account.json](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/firebase-service-account.json)
- [.gitignore](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/.gitignore)

**Possible root cause:** `.gitignore` was added after initial commits. Firebase service account file is not excluded at all.

**Recommended fix:**
1. Rotate ALL credentials immediately (Supabase, Razorpay, MongoDB, JWT secret, Firebase SA)
2. Add `firebase-service-account.json` to `.gitignore`
3. Use `git filter-branch` or BFG Repo-Cleaner to purge secrets from git history
4. Never store `.env.development` with real values in version control

---

### C-02: JWT_SECRET is a Placeholder

**Severity:** Critical  
**Confidence:** High

**Why it is a problem:**  
The JWT secret used to sign Donation JWTs is literally `replace-with-a-long-random-secret` in [backend/.env.development](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/.env.development#L12). If this value is also used in production, any attacker can forge donation JWTs, impersonate any user, access admin endpoints, and manipulate donation records.

**Files involved:**
- [backend/.env.development](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/.env.development#L12)
- [backend/src/middleware/donationAuth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/donationAuth.ts#L9)

**Recommended fix:** Generate a cryptographically random secret (≥256 bits). Ensure production deployment uses a unique, non-committed secret.

---

### C-03: Razorpay Webhook Secret is `ashramapp`

**Severity:** Critical  
**Confidence:** High

**Why it is a problem:**  
The webhook signature verification uses `RAZORPAY_WEBHOOK_SECRET=ashramapp`. This is a trivially guessable 9-character string. An attacker who knows this secret can forge webhook payloads, marking any booking or donation as paid without actually paying. This was explicitly flagged in IMPLEMENTATION.md as a known issue but remains unfixed.

**Files involved:**
- [backend/.env.development](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/.env.development#L8)
- [backend/src/routes/razorpayWebhook.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/razorpayWebhook.ts#L85)

**Recommended fix:** Replace with a cryptographically random secret (≥32 chars). Configure matching secret in the Razorpay Dashboard.

---

### C-04: No Rate Limiting on Any Endpoint

**Severity:** Critical  
**Confidence:** High

**Why it is a problem:**  
Zero rate limiting exists anywhere in the application. This enables:
- **OTP abuse:** Unlimited Firebase OTP requests → SMS bill flooding
- **Booking spam:** Attacker creates hundreds of `payment_pending` bookings to exhaust all seats (no expiration mechanism runs — see C-06)
- **Donation spam:** Unlimited PENDING donations created → Razorpay order exhaustion
- **Brute-force attacks** on admin endpoints
- **DDoS amplification** through expensive database operations

**Files involved:**
- [backend/src/app.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/app.ts) — no rate limiter middleware

**Recommended fix:** Add `express-rate-limit` at minimum. Apply strict limits to:
- Auth endpoints: 5 req/min per IP
- Booking creation: 3 req/min per user
- Payment endpoints: 5 req/min per user
- Webhook: 100 req/min per IP
- Admin: 30 req/min per user

---

### C-05: IDOR on Donation Status and Receipt Endpoints

**Severity:** Critical  
**Confidence:** High

**Why it is a problem:**  
The endpoints `GET /api/donations/:id/status` and `GET /api/donations/:id/receipt` have **no authentication middleware**. Any person with a valid MongoDB ObjectId can:
1. Enumerate donation statuses
2. Download any donor's receipt PDF containing their name, phone number, PAN number, and donation amount

This is a **PII data breach** vulnerability.

**Files involved:**
- [backend/src/routes/donations.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/donations.ts#L9-L10) — no auth middleware on status/receipt
- [backend/src/controllers/donations.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/controllers/donations.ts#L91-L93)

**Possible root cause:** These endpoints were designed for guest donation flows where the user doesn't have an account. But ObjectIds are not unguessable — they are partially sequential.

**Recommended fix:** Either:
- Add a random `accessToken` to each donation and require it as a query parameter
- Or require authentication and verify ownership

---

### C-06: Stale Bookings Never Expire — Seat Exhaustion Attack

**Severity:** Critical  
**Confidence:** High

**Why it is a problem:**  
The `expire_stale_bookings` RPC exists in the database schema and is referenced in `database.types.ts`, but it is **never called anywhere in the backend code**. Bookings in `payment_pending` status are never expired. Combined with no rate limiting (C-04), an attacker can:
1. Create bookings until `remaining_seats = 0`
2. Never pay for any of them
3. The package becomes permanently sold out

**Files involved:**
- [supabase/migrations/20260602000000_razorpay_payments.sql](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/supabase/migrations/20260602000000_razorpay_payments.sql)
- [backend/src/routes/bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts) — no expiry logic
- No `expires_at` is set on booking creation

**Recommended fix:**
1. Set `expires_at` on booking creation (e.g., `now() + 30 minutes`)
2. Implement a cron job or pg_cron to call `expire_stale_bookings()` periodically
3. Or check expiry on each seat availability query

---

## 3. High Priority Issues

### H-01: Payment Amount Mismatch Between Booking and Payment

**Severity:** High  
**Confidence:** High

**Why it is a problem:**  
In [bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L137-L143), the booking's `total_amount` is calculated from `getYatraPrice()` (preference-based pricing matrix — e.g., ₹35,000 for Flight+AC Room). But in [payments.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/payments.ts#L51), the payment amount is calculated from `travelPackage.price` (the base DB price) × `traveler_count`. These are **different values**. The booking stores one amount; the payment charges a different amount.

**Files involved:**
- [backend/src/routes/bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L137-L143)
- [backend/src/routes/payments.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/payments.ts#L51)
- [backend/src/utils/yatraPricing.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/utils/yatraPricing.ts)

**Recommended fix:** The payment endpoint should read the amount from `booking.total_amount` (or re-derive it from the same `getYatraPrice` logic used during booking creation), not from `travelPackage.price`.

---

### H-02: Admin Endpoints Accept Arbitrary MongoDB Document Insertion

**Severity:** High  
**Confidence:** High

**Why it is a problem:**  
In [donationAdmin.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/donationAdmin.ts#L13), the `/donations/offline` endpoint does `Donation.create({ ...body, ... })` — it spreads the entire raw request body into the Mongoose model. An admin user could inject arbitrary fields, including overriding `status`, `amount`, `user`, `collectorId`, etc. Similarly, the donation head creation endpoint accepts raw `request.body` with no validation.

**Files involved:**
- [backend/src/routes/donationAdmin.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/donationAdmin.ts#L13)
- [backend/src/routes/donationAdmin.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/donationAdmin.ts#L27)

**Recommended fix:** Whitelist accepted fields. Never spread raw request body into database models.

---

### H-03: supabaseAdmin.ts Hardcodes dotenv Path to Development

**Severity:** High  
**Confidence:** High

**Why it is a problem:**  
[supabaseAdmin.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/services/supabaseAdmin.ts#L4-L6) hardcodes `dotenv.config({ path: 'backend/.env.development' })`. In production, this will:
1. Try to load a development env file that doesn't exist
2. Fall back to whatever environment variables the host provides
3. If the host's working directory doesn't match expectations, environment variables will be undefined and the server will crash on startup

**Files involved:**
- [backend/src/services/supabaseAdmin.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/services/supabaseAdmin.ts#L4-L6)

**Recommended fix:** Use `dotenv/config` at the entrypoint only (already done in `app.ts`). Remove the redundant dotenv call from `supabaseAdmin.ts`.

---

### H-04: Production .env Contains Placeholder Values

**Severity:** High  
**Confidence:** High

**Why it is a problem:**  
[.env.production](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/.env.production) contains:
- `EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`
- `EXPO_PUBLIC_RAZORPAY_KEY_ID=<your-razorpay-key>`

These are literal angle-bracket placeholders. A production build will ship with non-functional API clients. Additionally, the env var names differ between dev and prod (`EXPO_PUBLIC_API_BASE_URL` in dev vs `EXPO_PUBLIC_API_URL` in prod) — the code reads `EXPO_PUBLIC_API_BASE_URL`, so the production URL will never be picked up.

**Files involved:**
- [.env.production](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/.env.production)
- [src/api/axiosClient.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/src/api/axiosClient.ts#L6)

**Recommended fix:** Populate real values. Ensure env var names match what the code reads.

---

### H-05: Booking Rollback Does Not Clean Up Passengers or Documents

**Severity:** High  
**Confidence:** Medium

**Why it is a problem:**  
In [bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L262-L266), the manual rollback only deletes the booking row: `supabaseAdmin.from('bookings').delete().eq('id', booking.id)`. If `booking_passengers` has a CASCADE delete on `booking_id`, this is fine. But if the cascade is not configured, orphaned passenger rows and documents will remain. **Requires schema verification** — the migration for `booking_passengers` is not in the viewed files, so the FK constraint behavior needs to be confirmed.

**Files involved:**
- [backend/src/routes/bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L262-L266)

**Recommended fix:** Explicitly delete passengers and documents in the rollback, or verify `ON DELETE CASCADE` is set.

---

### H-06: Seva Payment Verify Does Not Check `razorpay_order_id` Match

**Severity:** High  
**Confidence:** High

**Why it is a problem:**  
In [payments.ts verify-seva](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/payments.ts#L269-L315), the signature is validated, but the code does NOT verify that `razorpay_order_id` matches the booking's stored `razorpay_order_id`. An attacker could use a valid signature from a different Razorpay order (even a ₹1 test order) to mark a seva booking as paid.

**Files involved:**
- [backend/src/routes/payments.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/payments.ts#L281-L305)

**Recommended fix:** Add: `if (booking.razorpay_order_id !== razorpay_order_id) throw new HttpError(400, 'Order ID mismatch')`

---

### H-07: CORS is Wide Open

**Severity:** High  
**Confidence:** High

**Why it is a problem:**  
In [app.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/app.ts#L25-L29), `origin: process.env.FRONTEND_URL ?? true` — if `FRONTEND_URL` is not set (which it won't be in many deployment configs), this defaults to `true`, which allows **any origin** to make authenticated requests.

**Recommended fix:** Set an explicit allowlist of origins in production. Never default to `true`.

---

## 4. Medium Priority Issues

### M-01: Travel Backend Auth Falls Through to Supabase Auth Before Firebase

**Severity:** Medium  
**Confidence:** Medium

**Why it is a problem:**  
In [auth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/auth.ts#L14-L18), the middleware first tries `supabaseAdmin.auth.getUser(token)`. Supabase Auth is not the identity provider — Firebase is. This means every request makes an unnecessary round-trip to Supabase Auth before falling through to Firebase verification. More importantly, if someone has a valid Supabase Auth token (from a different project using the same Supabase instance), they could authenticate as a different user.

**Files involved:**
- [backend/src/middleware/auth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/auth.ts#L14-L18)

**Recommended fix:** Remove the Supabase auth check. Firebase is the sole identity provider.

---

### M-02: No Upper Bound on Traveler Count

**Severity:** Medium  
**Confidence:** High

**Why it is a problem:**  
The booking validation checks `travelerCount >= 1` but has **no upper bound**. A user could submit `travelerCount: 999` with 999 passenger objects, causing:
- Massive database writes
- Potential OOM on passenger validation loops
- Seat exhaustion

**Files involved:**
- [backend/src/routes/bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L46-L48)

**Recommended fix:** Add `travelerCount > 20` (or a reasonable business limit) as a validation check.

---

### M-03: Guest Donation Creates Unbounded Pending Records

**Severity:** Medium  
**Confidence:** High

**Why it is a problem:**  
`POST /api/donations/create` with `optionalDonationAuth` allows unauthenticated users to create unlimited PENDING donation records. Each triggers a Razorpay order when `create-order` is called. There is no cleanup mechanism for abandoned donations.

**Files involved:**
- [backend/src/routes/donations.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/donations.ts#L7)
- [backend/src/controllers/donations.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/controllers/donations.ts#L50-L66)

**Recommended fix:** Add rate limiting per IP. Add TTL/cleanup for PENDING donations older than 24 hours.

---

### M-04: Deleted Users Can Still Authenticate

**Severity:** Medium  
**Confidence:** High

**Why it is a problem:**  
Account deletion in [users.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/users.ts#L47-L59) only sets `deleted_at` (soft delete). But the auth middleware in [auth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/auth.ts) never checks `deleted_at`. A "deleted" user retains full access.

**Recommended fix:** Add `deleted_at IS NULL` check in the auth middleware's user lookup.

---

### M-05: File Upload Path Traversal Risk

**Severity:** Medium  
**Confidence:** Medium

**Why it is a problem:**  
In [upload.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/upload.ts#L23), the `userId` is used directly in `path.join(UPLOAD_BASE_DIR, userId)`. While the userId comes from the auth middleware (so it should be a UUID), if any code path provides a userId with path separators (e.g., `../../etc`), it could write outside the intended directory. The `file.originalname` is also used for extension extraction without sanitization.

**Files involved:**
- [backend/src/middleware/upload.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/upload.ts#L23-L35)

**Recommended fix:** Validate that userId matches UUID format. Sanitize file extensions to a whitelist.

---

### M-06: Donation Token Never Expires on Client

**Severity:** Medium  
**Confidence:** High

**Why it is a problem:**  
The donation JWT has a 7-day expiry (`expiresIn: '7d'`), but the client stores it in SecureStore indefinitely. The token is never refreshed. After 7 days, all donation API calls will silently fail with 401 errors. There is no token refresh mechanism.

**Files involved:**
- [backend/src/middleware/donationAuth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/middleware/donationAuth.ts#L37)
- [src/services/auth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/src/services/auth.ts#L63-L69)

**Recommended fix:** Re-issue the donation token on each app launch (in `finishFirebaseUser`). Add a 401 interceptor to the donation Axios client that triggers re-authentication.

---

### M-07: Error Handler Leaks Internal Error Messages

**Severity:** Medium  
**Confidence:** High

**Why it is a problem:**  
The global error handler in [app.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/app.ts#L69-L76) sends `error.message` directly to the client for 500 errors. This can leak internal details (database connection strings, SQL errors, file paths).

**Recommended fix:** For non-HttpError exceptions, return a generic "Internal server error" message and log the real error server-side.

---

### M-08: Receipt Files Served Without Authentication

**Severity:** Medium  
**Confidence:** High

**Why it is a problem:**  
`app.use('/receipts', express.static('backend/receipts'))` in [app.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/app.ts#L63) serves all receipt PDFs as static files. If an attacker knows or guesses a MongoDB ObjectId, they can download any receipt at `/receipts/receipt_<ObjectId>.pdf`.

**Recommended fix:** Remove the static file serving. Serve receipts only through the authenticated/tokenized receipt endpoint.

---

## 5. Low Priority Issues

### L-01: Hardcoded `+91` Country Code

**Severity:** Low  
**Confidence:** High

[auth.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/src/services/auth.ts#L79) hardcodes `+91` for phone auth. Not a problem for India-only use, but will break for international users.

---

### L-02: `console.error` / `console.warn` Instead of Proper Logging

**Severity:** Low  
**Confidence:** High

Backend uses `console.error` and `console.log` throughout. No structured logging, no log levels, no correlation IDs. Debugging production issues will be extremely difficult.

---

### L-03: Temporary `read_diff.js` File Left in Backend

**Severity:** Low  
**Confidence:** High

[backend/read_diff.js](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/read_diff.js) is a debug artifact that should be deleted.

---

### L-04: Dead Code — `actualAmount` Variable

**Severity:** Low  
**Confidence:** High

In [bookings.ts](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L141), `const actualAmount = Number(travelPackage.price) * travelerCount` is computed but never used. This is confusing and suggests incomplete refactoring.

---

### L-05: `require()` Used Inside Route Handler

**Severity:** Low  
**Confidence:** High

[bookings.ts line 137](file:///c:/Users/abuna/Desktop/proj/shri-gurudev-ashram-app/backend/src/routes/bookings.ts#L137) uses `const { getYatraPrice } = require('../utils/yatraPricing')` — a dynamic `require()` inside a request handler instead of a top-level import. This is a code smell.

---

## 6. Security Audit

| Finding | Severity | Status |
|---------|----------|--------|
| Secrets in git | Critical | **OPEN** — C-01 |
| Weak JWT secret | Critical | **OPEN** — C-02 |
| Weak webhook secret | Critical | **OPEN** — C-03 |
| No rate limiting | Critical | **OPEN** — C-04 |
| IDOR on donation status/receipt | Critical | **OPEN** — C-05 |
| CORS wide open | High | **OPEN** — H-07 |
| Admin endpoint mass-assignment | High | **OPEN** — H-02 |
| Deleted users can authenticate | Medium | **OPEN** — M-04 |
| Path traversal risk in uploads | Medium | **OPEN** — M-05 |
| Error messages leak internals | Medium | **OPEN** — M-07 |
| Receipt files publicly accessible | Medium | **OPEN** — M-08 |
| Supabase auth fallthrough | Medium | **OPEN** — M-01 |
| SQL injection via Supabase client | Low | Not applicable — parameterized queries |
| NoSQL injection | Low | Mongoose schema provides basic protection |
| Input validation library | N/A | Manual validation is present but inconsistent |

---

## 7. Payment Audit

| Finding | Severity | Status |
|---------|----------|--------|
| Booking amount ≠ payment amount | High | **OPEN** — H-01 |
| Seva verify doesn't match order_id | High | **OPEN** — H-06 |
| No booking expiration | Critical | **OPEN** — C-06 |
| Guest donation spam | Medium | **OPEN** — M-03 |
| Travel payment signature verification | OK | `timingSafeEqual` used correctly |
| Travel webhook de-duplication | OK | `razorpay_webhook_events` table works |
| Travel `capture_booking_payment` RPC atomicity | OK | Uses `FOR UPDATE` locks |
| Donation webhook handler | OK | Correct state transitions |
| Duplicate payment detection (travel) | OK | Checks `razorpay_payment_id` uniqueness |
| Seva payment has no webhook reconciliation | Medium | Only client-verify path exists — if client crashes after payment, seva stays `payment_pending` forever |

---

## 8. Navigation Audit

| Finding | Severity |
|---------|----------|
| Onboarding redirect only checks `fullName` — a user with an empty email/phone could bypass | Low |
| No deep link handling configured (no `expo-linking` setup beyond scheme) | Low |
| Back button from `edit-profile` during onboarding could return to tabs with incomplete profile | Medium |
| Android hardware back from login OTP step does not clear confirmation state | Low |
| No explicit screen for expired sessions — user sees generic API errors | Medium |

---

## 9. Performance Audit

| Finding | Severity |
|---------|----------|
| `getCurrentUser()` called on every app launch makes 2 API calls (travel + donation) before showing any screen | Medium |
| `BookingForm.tsx` (854 lines) is a single monolithic component — re-renders entire form on any state change | Low |
| `DonationScreen.tsx` (729 lines) — same problem | Low |
| No image optimization/compression before upload (up to 10MB images uploaded as-is) | Medium |
| No pagination on booking history, seva history, notification list, donation history queries | Medium |
| `Donation.find({ status: 'SUCCESS' }).sort({ createdAt: -1 }).limit(10)` on public endpoint without compound index on `{status, createdAt}` — will table scan | Low |

---

## 10. Responsive Design Audit

| Finding | Severity |
|---------|----------|
| `Dimensions.get('window')` used at module level in DonationScreen — does not update on orientation change or foldable state change | Medium |
| Hardcoded pixel values throughout stylesheets (e.g., `width: 62, height: 62, borderRadius: 31`) — will not scale on very small or very large devices | Low |
| `KeyboardAvoidingView` on Android uses `behavior={undefined}` in most screens — the `softwareKeyboardLayoutMode: 'pan'` in `app.json` helps but may conflict with per-screen KeyboardAvoidingView logic | Low |

---

## 11. Accessibility Audit

| Finding | Severity |
|---------|----------|
| No `accessibilityLabel` on any interactive element across the codebase | Medium |
| No `accessibilityRole` attributes | Medium |
| Touch targets below 44×44 minimum (e.g., back button is `width: 44, height: 44` which is borderline but OK; many chip/card elements are smaller) | Low |
| No high-contrast or dark mode support | Low |
| Font sizes are hardcoded — do not respect system font scaling | Medium |
| No screen reader announcements for state changes (payment success, error states) | Medium |

---

## 12. Production Readiness Audit

| Item | Status |
|------|--------|
| Production `.env` files | ❌ Placeholders — H-04 |
| Production API URL mismatch | ❌ Env var name mismatch — H-04 |
| Rate limiting | ❌ None — C-04 |
| Structured logging | ❌ console.log only — L-02 |
| Error monitoring (Sentry/Bugsnag) | ❌ Not integrated |
| Analytics | ❌ Not integrated |
| Health check endpoint | ❌ None |
| Graceful shutdown | ❌ Not implemented |
| Database connection pooling | ⚠️ Supabase client handles it; Mongoose has defaults |
| EAS build configuration | ⚠️ Exists but untested with prod env |
| Offline behavior | ❌ No offline support, no request queuing |
| Request timeout handling | ⚠️ Axios has 10s timeout; no retry logic |
| APK/AAB signing | Requires code verification |
| App Store/Play Store metadata | Requires code verification |
| Privacy policy | Requires code verification |

---

## 13. Missing Test Cases

1. Booking creation with maximum traveler count (boundary)
2. Booking creation when `remaining_seats = 0`
3. Payment amount verification (ensure amount charged matches booking amount)
4. Concurrent booking creation (race condition for last seat)
5. Webhook replay attack (same event_id delivered twice)
6. Webhook with forged signature
7. Donation creation with invalid/inactive donation head
8. Donation order creation by non-owner
9. Guest donation → login → donation linking
10. JWT expiration handling on the donation flow
11. File upload with non-image file (MIME type spoofing)
12. File upload exceeding size limit
13. Account deletion → re-login behavior
14. Seva booking with past date
15. Negative or zero amount on all payment endpoints
16. XSS in user-provided fields (fullName, address, notes)

---

## 14. Edge Cases for Manual Testing Before Release

1. **Double-tap submit** on booking/donation/seva creation
2. **Kill app during Razorpay checkout** and reopen — does the booking/donation recover?
3. **Network disconnect during document upload** — does the form state survive?
4. **Login with a phone number that exists in MongoDB but not PostgreSQL** — and vice versa
5. **Create a booking, log out, log in with a different phone** — is the draft still visible?
6. **Submit booking with lead traveler verified + second traveler not verified** — do documents upload correctly for only the second traveler?
7. **Cancel a paid booking** — does seat count restore?
8. **Razor pay callback fails but webhook succeeds** — does the UI eventually show success?
9. **Fill booking form → background the app for 30+ minutes → resume** — is the Firebase token still valid?
10. **Use the app on a device with system font scaling at 200%** — is the UI usable?
11. **Rapid navigation between tabs** — does anything crash?
12. **Fill the donation form as a guest → navigate back → come back** — is form state preserved?

---

## 15. Overall Production Readiness Score

# 34 / 100

| Category | Score | Weight |
|----------|-------|--------|
| Security | 15/100 | 30% |
| Payment integrity | 40/100 | 25% |
| Core functionality | 60/100 | 20% |
| Production config | 10/100 | 10% |
| UX/Performance | 55/100 | 10% |
| Testing | 20/100 | 5% |

---

## 16. Launch Approval Decision

### ❌ **I would NOT approve this application for release.**

**Justification:**

The application has **6 critical security vulnerabilities** that, individually, could each cause a production incident:

1. **Secrets in version control** means all credentials should be considered compromised. Before ANY deployment, every single credential must be rotated.

2. **The trivially guessable webhook secret** means an attacker can mark any booking or donation as "paid" without actually paying. This is a direct financial loss vector.

3. **The IDOR on donation receipts** means any person can download any donor's receipt, exposing names, phone numbers, PAN numbers, and donation amounts. This is a privacy law violation (India's DPDP Act) waiting to happen.

4. **No rate limiting** combined with **no booking expiration** means a single malicious actor can permanently sell out every travel package on the platform by creating fake bookings.

5. **The payment amount mismatch** (H-01) means travelers may be charged a different amount than what their booking shows — this is both a financial and trust issue.

6. **The production environment is non-functional** — `.env.production` has placeholder values and mismatched variable names. The app literally cannot make a single API call in a production build.

The architecture is generally sound, the code quality is reasonable, and the core user flows work. But the security posture is not ready for handling real money and real personal data. Fixing the critical and high issues is an estimated **2–3 weeks of focused work** before a responsible launch.
