# Shri Gurudev Ashram Donation & Collector Integration Audit

## Scope and conclusion

This audit is based on the attached `backend.zip` archive. It is analysis only; no application code was modified.

The donation backend is an Express service backed by MongoDB and Razorpay. It can be consumed by the Expo app independently of the travel/Supabase backend. The existing public donation flow supports:

- dynamic donation heads and sub-causes;
- guest donations and optional authenticated-user linkage;
- optional collector attribution through a referral code;
- Razorpay order creation;
- webhook-authoritative payment success/failure updates;
- PDF receipt generation and optional email delivery;
- authenticated donation history;
- collector dashboards and leaderboards.

The mobile app should treat this backend and MongoDB as the source of truth for donations. It should not write donation records to Supabase or implement its own payment verification.

## 1. Architecture summary

## Authentication & User Experience Policy

The mobile application should follow a progressive authentication model.

### Browsing (No Login Required)

Users should be able to access the following without signing in:

- Browse travel packages
- Browse donation heads and causes
- View collectors
- View general Ashram information
- View public leaderboards and other public content exposed by the backend

The application should not prompt for login on launch.

### Travel Module

Authentication is **mandatory** before a user can:

- Book a travel package
- View booking history
- Manage their travel profile
- Access any authenticated travel functionality

Travel remains a login-required workflow.

#

### First Login Onboarding

After successful Firebase authentication:

1. Check whether the user's **full name** already exists in their profile.
2. If a full name exists, continue directly into the application.
3. If it does not exist, present a mandatory "Complete Profile" screen requesting only the full name.
4. Save the full name to the Travel (Supabase) profile and the MongoDB user profile before allowing the user into the app.

This onboarding screen should only appear once unless the user later clears or edits their profile.

## Donation Module

### Development Authentication Mode

To improve developer productivity, implement a **development-only authentication bypass**.

Requirements:

- Available only in development builds / development backend environments.
- Must be completely disabled in production.
- Should bypass Firebase OTP while still issuing the normal backend sessions/JWTs.
- The app should behave exactly as if the user had completed Firebase Phone Authentication.
- This bypass exists only to avoid repeated OTP verification during development and testing.

The donation system should support **guest donations**.

Guests should be able to:

- Fill in the donation form
- Provide their mobile number and donor details
- Complete Razorpay payment
- Have the donation stored in MongoDB using the existing backend flow

If the donor later signs in using the **same phone number** via Firebase Phone Authentication, the application should allow them to view their previous donations through the existing backend APIs. Where backend changes are required to associate historical guest donations with the authenticated account, implement the smallest possible backend change rather than redesigning the donation system.

Collector features, collector applications, dashboards, and authenticated donation history remain login-only features.

The backend mounts the relevant modules as follows:

| Concern                                                  | Base path                           | Storage / authority                                                         |
| -------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Firebase phone login to backend session                  | `/api/auth`                         | Firebase verifies the ID token; MongoDB stores the user; backend issues JWT |
| Donation initiation and payment order                    | `/api/donations`                    | MongoDB donation document plus Razorpay order                               |
| Public causes, referral validation, public donation data | `/api/public`                       | MongoDB; no login                                                           |
| User donation history                                    | `/api/user`                         | MongoDB; backend JWT required                                               |
| Collector application/dashboard                          | `/api/collector`                    | MongoDB User and Donation documents; backend JWT required                   |
| Referral validation/leaderboards                         | `/api/referral`, `/api/leaderboard` | MongoDB; public                                                             |
| Razorpay callbacks                                       | `/api/webhooks/razorpay`            | Razorpay webhook; signature verified with webhook secret                    |
| Receipt files                                            | `/receipts`                         | Server filesystem, generated as PDFs                                        |

There are two MongoDB connections in the code: `mainDb` uses `MONGO_URI` and owns `User` and `Donation`; `sharedDb` uses `MONGO_URI_SHARED` and owns `DonationHead`. The `.env.example` documents `MONGO_URI` but does not document `MONGO_URI_SHARED`; the deployed environment must still provide it because `db.js` requires both connections.

The Express app applies JSON parsing globally but applies `express.raw({type: "application/json"})` specifically to `/api/webhooks/razorpay`, which is required for HMAC verification of the exact webhook body. CORS is configured for one `FRONTEND_URL` and allows the `Authorization` header.

### Firebase integration

`POST /api/auth/verify-firebase-token` calls Firebase Admin `verifyIdToken`, requires a `phone_number` claim, normalizes an Indian `+91` number to a 10-digit mobile value, finds or creates a MongoDB User, asynchronously assigns a referral code, and returns a 7-day backend JWT. The client must use that returned JWT for protected donation/collector APIs; the Firebase ID token is not the backend session token.

The archive contains `firebaseAdmin.js`, which requires `src/config/firebase.json`, but that service-account file is not present in the archive listing. It is therefore a deployment secret/prerequisite, not a mobile asset. The Firebase service account must remain server-side.

## 2. MongoDB models

### `Donation` (`src/models/Donation.js`, `mainDb`)

Purpose: self-contained donation transaction and donor snapshot. It deliberately copies donor and collector display data into the donation so receipts and historical records do not depend on future profile changes.

Important fields:

- `user`: optional `ObjectId` reference to `User`; set from the authenticated backend JWT when present.
- `collectorId`: nullable `ObjectId` reference to `User`.
- `collectorName`: collector-name snapshot used for receipts/leaderboards.
- `hasCollectorAttribution`: explicit boolean; only true when a referral code was supplied and validated at creation time.
- `donor`: required `name`, `mobile`, `dob`, `idType` (`PAN`), and `idNumber`; optional email, email opt-in/verification flags, legacy string address, structured `addressObj`, and `anonymousDisplay`.
- `donationHead`: required `{ id, name }` snapshot. The schema does not create a MongoDB reference to `DonationHead`.
- `amount`: numeric INR amount.
- Legacy payment fields: `paymentMethod`, `razorpayOrderId`, `paymentId`, `status`, `transactionRef`, `failureReason`.
- Unified `payment` subdocument: method/status plus UPI UTR or cheque details. The online Razorpay flow primarily updates the legacy fields.
- Receipt fields: `receiptUrl`, `receiptNumber`, `emailSent`.
- `otpVerified`: present in the schema but creation forcibly sets it to `false`; no donation OTP endpoint was found in the audited routes.
- `addedBy`: optional admin `User` reference for offline donations.

Relationships: optional donor-to-User, optional collector-to-User, and a denormalized donation-head snapshot. Successful donation queries drive public recent/top-donor data, collector stats, and cause statistics.

### `DonationHead` (`src/models/DonationHead.js`, `sharedDb`)

Purpose: dynamic donation causes/heads replacing hardcoded frontend causes.

Important fields:

- `key`: unique lowercase public key such as `annadan` or `education`.
- Multilingual `name`, `description`, and optional `longDescription`.
- `imageUrl`, `iconKey`, `minAmount`, `presetAmounts`, `order`, `isActive`, `isFeatured`.
- Embedded `subCauses[]`, each with `_id`, `key`, multilingual name/description, `minAmount`, and `isActive`.
- `is80GEligible`, optional `goalAmount`, `currentAmount`.
- `createdBy` and `updatedBy` admin User references.
- Virtual `collectedPercentage` based on `currentAmount / goalAmount`.

Relationship: there is no database-level relationship from a Donation to a DonationHead. Donations store `donationHead.id` and `donationHead.name` as strings. The admin/controller comments say the name is the historical identifier. Cause stats match successful donations by the stored head name.

### `User` (`src/models/User.js`, `mainDb`)

Purpose: backend identity, donor linkage, and collector identity/application.

Important fields:

- `fullName`, `email`, `emailVerified`, `mobile`, `whatsapp`, `address`.
- `role`: `USER`, `COLLECTOR_PENDING`, `COLLECTOR_APPROVED`, `WEBSITE_ADMIN`, or `SYSTEM_ADMIN`.
- Unique sparse `referralCode` and `collectorDisabled`.
- Embedded `collectorProfile`: KYC full name/address/PAN, Aadhar front/back file keys and timestamps, status (`none`, `pending`, `approved`, `rejected`), submission/approval dates, and rejection reason.

Relationships: a User can own many Donations through `Donation.user` and can be the collector for many Donations through `Donation.collectorId`. Every registered user receives a referral code asynchronously, and the service comments describe every registered user as a collector for attribution purposes; KYC approval is a separate workflow.

No separate Collector collection/model exists. Collectors are Users with referral and/or collector-profile fields.

## 3. Existing reusable APIs

All URLs below are relative to the donation backend origin.

### Donation and payment APIs

#### `POST /api/donations/create`

Authentication: optional backend JWT. A valid JWT links `Donation.user`; no JWT creates a guest donation.

Request body:

```json
{
  "donor": {
    "name": "string",
    "mobile": "string",
    "email": "string",
    "emailOptIn": false,
    "emailVerified": false,
    "addressObj": {
      "line": "string",
      "city": "string",
      "state": "string",
      "country": "India",
      "pincode": "string"
    },
    "anonymousDisplay": false,
    "dob": "YYYY-MM-DD",
    "idType": "PAN",
    "idNumber": "ABCDE1234F"
  },
  "donationHead": { "id": "string", "name": "string" },
  "amount": 100,
  "referralCode": "COLXXXXXX"
}
```

The server requires donor name/mobile/address/date of birth/PAN fields, age 18+, PAN format, amount INR 10 to INR 10,000,000, and non-empty donation-head id/name. If a referral code is supplied, it must resolve to an active code or the request is rejected. The server ignores client `otpVerified` input and creates status `PENDING`.

Response `201`:

```json
{
  "message": "Donation initiated",
  "donationId": "ObjectId",
  "status": "PENDING"
}
```

#### `POST /api/donations/create-order`

Authentication: optional JWT middleware, but the current controller does not enforce ownership. Body: `{ "donationId": "ObjectId" }`. It loads the donation, creates a Razorpay order for `amount * 100` paise, stores `razorpayOrderId`, and returns:

```json
{
  "razorpayOrderId": "order_...",
  "amount": 10000,
  "currency": "INR",
  "key": "rzp_..."
}
```

Important integration/security note: the controller does not check that the donation is `PENDING`, that it belongs to the authenticated user, or that it has not already received an order. The mobile app should call it only for the donation it just created. A minimal backend hardening addition would enforce `PENDING` and ownership when a JWT is present, without changing the donation design.

#### `GET /api/donations/:id/status`

Authentication: none; donation ID acts as the lookup token. Returns `404 {status:"NOT_FOUND"}` when absent. Success response:

```json
{
  "status": "PENDING|SUCCESS|FAILED",
  "donationHead": { "id": "string", "name": "string" },
  "amount": 100,
  "receiptNumber": "GRD-..."
}
```

This is the required polling endpoint after checkout. There is intentionally no backend payment-verification endpoint.

#### `GET /api/donations/:id/receipt`

Authentication: none; donation ID acts as the access token. Only `SUCCESS` donations are allowed. The response is a PDF stream with `Content-Type: application/pdf` and an attachment filename. The endpoint regenerates the current receipt template and stores `receiptUrl` if needed.

#### `GET /api/user/donations`

Authentication: required backend JWT. Returns the authenticated user’s donations sorted newest first. The response is a JSON array; each item includes `_id`, `donationHead`, `donorName`, the donor snapshot, `amount`, `status`, `createdAt`, `receiptUrl`, and `receiptNumber`. This is the existing donation-history API.

#### `GET /api/donations/me/last-profile`

Authentication: required backend JWT. Returns safe fields from the latest successful donation for form auto-fill: `fullName`, `mobile`, `email`, `panNumber`, `dob`, and address fields. It excludes payment details, amount, referral, and internal IDs. Returns `404` when no successful donation exists.

### Donation heads / causes

All four endpoints are public and accept an optional language query/header through `langMiddleware`. Responses use `{ success: true, data: ... }`.

| Method and URL                                    | Authentication | Response/purpose                                                                  |
| ------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `GET /api/public/donation-heads`                  | None           | Active heads, sorted by `order`; excludes admin audit fields.                     |
| `GET /api/public/donation-heads/featured?limit=4` | None           | Active featured heads, limited by query parameter.                                |
| `GET /api/public/donation-heads/:key`             | None           | One active head by lowercase public key.                                          |
| `GET /api/public/donation-heads/:key/stats`       | None           | Cause name, goal amount, total successful donated amount, and percentage reached. |

### Referral and collector APIs

| Method and URL                           | Authentication         | Request/response and purpose                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/public/referral/:code`         | None                   | `{valid, collectorName}` only; public-safe referral preview. Invalid codes return `{valid:false}`.                                                                                                                      |
| `GET /api/referral/validate/:code`       | None                   | `{valid, collectorId, collectorName}` for valid codes, or `{valid:false,error}`. Rate limited. The mobile app can use the public endpoint to avoid exposing IDs, because donation creation validates again server-side. |
| `GET /api/donations/leaderboard?limit=5` | None                   | `{leaderboard:[{rank,collectorId,collectorName,totalAmount,donationCount}]}`; limit capped at 20. Successful explicitly attributed donations only.                                                                      |
| `GET /api/leaderboard/top`               | None                   | `{success:true,data:[...]}`; same leaderboard concept, fixed at top five.                                                                                                                                               |
| `GET /api/donations/my-collector-stats`  | Backend JWT            | `{referralCode,collectorName,totalAmount,donationCount}` for current user.                                                                                                                                              |
| `GET /api/collector/dashboard`           | Backend JWT            | `{success:true,data:{referralCode,collectorName,totalAmount,donationCount,top5Collectors,recentDonations}}`. Recent donations mask anonymous donors.                                                                    |
| `POST /api/collector/apply`              | Backend JWT; multipart | Fields `fullName`, `address`, `panNumber`; files `aadharFront` and `aadharBack`. Requires role `USER`; validates PAN and uploads both files. Sets role `COLLECTOR_PENDING`.                                             |
| `GET /api/collector/status`              | Backend JWT            | `{success:true,data:{role,collectorProfile}}`, with KYC file keys removed.                                                                                                                                              |
| `POST /api/collector/reapply`            | Backend JWT; multipart | Same fields/files as apply; only rejected users may reapply. Deletes old KYC files and sets pending status.                                                                                                             |

### Authentication APIs used by donation integration

| Method and URL                              | Authentication                        | Purpose/response                                                                                                |
| ------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/verify-firebase-token`      | None; body contains Firebase ID token | Verifies phone token, upserts Mongo User, asynchronously assigns referral code, returns `{success,token,user}`. |
| `GET /api/auth/me`                          | Backend JWT                           | Returns current Mongo user, role, referral code, and safe collector profile.                                    |
| `GET /api/user/profile`                     | Backend JWT                           | Existing user profile API.                                                                                      |
| `PUT /api/user/profile`                     | Backend JWT                           | Existing user profile update API.                                                                               |
| `POST /api/user/generate-referral-code`     | Backend JWT                           | Generates a code on demand if missing.                                                                          |
| `POST /api/auth/request-email-verification` | Backend JWT                           | Stores email and sends a verification link; required before receipt email delivery.                             |
| `GET /api/auth/verify-email?token=...`      | None                                  | Completes email verification.                                                                                   |
| `GET /api/auth/email-status`                | Backend JWT                           | Returns email and `emailVerified`.                                                                              |

### Admin-only donation APIs (not for the mobile donor flow)

System-admin routes include `GET /api/admin/system/donations`, `POST /api/admin/system/donations/cash`, its `/donations/offline` alias, donor/report endpoints, collector summary/list/detail/toggle-status, collector application review, KYC document streaming, and approve/reject/revoke actions. Website-admin routes provide CRUD, upload, toggle, reorder, and sub-cause management for donation heads under `/api/admin/website/donation-heads`. These are management APIs and should not be embedded in the public mobile client.

## 4. Razorpay payment lifecycle

```text
Mobile fetches active donation heads
        |
        v
POST /api/donations/create
        |
        v
Mongo Donation created: PENDING, optional user and collector snapshot
        |
        v
POST /api/donations/create-order
        |
        v
Razorpay order created; order ID saved on Donation
        |
        v
Mobile opens Razorpay checkout using returned key/order/amount/currency
        |
        v
Razorpay sends signed payment.captured or payment.failed webhook
        |
        +--> payment.captured: atomic PENDING -> SUCCESS, payment ID and receipt number saved
        |                         -> PDF receipt generated and URL saved
        |                         -> optional verified/opted-in email sent
        |
        +--> payment.failed: PENDING -> FAILED, transactionRef and failureReason saved
        |
        v
Mobile polls GET /api/donations/:id/status
        |
        +--> SUCCESS: show receipt/download action
        +--> FAILED: show failed state/retry guidance
        +--> PENDING: continue polling with timeout/recovery UI
```

Details:

1. Creation is server-validated and rate limited. The donor snapshot is stored before payment.
2. Order creation uses the stored donation amount and multiplies it by 100 for paise. The Razorpay key ID is returned; the secret remains server-side.
3. The frontend payment callback is not trusted. The controller explicitly documents that no `verifyPayment` endpoint exists.
4. The webhook route receives raw JSON and verifies `x-razorpay-signature` with `RAZORPAY_WEBHOOK_SECRET`.
5. `payment.captured` updates only a matching `razorpayOrderId` whose status is still `PENDING`, making duplicate success webhooks harmless.
6. The success webhook generates a PDF, stores a public path such as `/receipts/receipt_<donationId>.pdf`, and sends email only when `emailOptIn === true`, `emailVerified === true`, and an email exists.
7. `payment.failed` stores the Razorpay payment ID and best available error description. No receipt is generated.
8. If the webhook is delayed or unavailable, the donation remains `PENDING`; the mobile UI must handle this explicitly and must not claim success from the checkout callback alone.

## 5. Collector system

There is no separate collector model. Collector identity is a MongoDB User plus a unique referral code. Referral code generation is assigned at registration or on demand. KYC is a separate application process that changes role/profile status; donation attribution itself is based on a valid, non-disabled referral code.

When a donor supplies `referralCode` to `POST /api/donations/create`, the server normalizes and validates it, resolves the User, stores `collectorId`, `collectorName`, and `hasCollectorAttribution: true`, and writes an attribution audit record. Without a referral code, these fields remain null/false. Collector totals count only `SUCCESS` donations with `hasCollectorAttribution: true`.

Important mobile behavior:

- A donor can use a referral code without being logged in.
- The mobile app should pass the code itself, not a collector ID, when creating a donation.
- Validate/display the collector name before submission if desired, but rely on `create` as the final validation.
- Do not assume `COLLECTOR_APPROVED` is required for a referral code; the resolver checks code existence and `collectorDisabled`, not role approval.
- Anonymous donor display is respected in collector dashboard recent donations and public recent donations.
- There is no commission/incentive calculation.
- Collector application requires multipart Aadhar front/back uploads and should be treated as a separate, authenticated workflow from ordinary donor payment.

## 6. Mobile integration plan

Keep the travel/Supabase client and the donation/Mongo client as separate API clients/base URLs. The donation client should:

1. Use **Firebase Phone Authentication as the single authentication flow** for the mobile application.
2. After Firebase login, obtain the Firebase ID token once.
3. Exchange the same Firebase ID token with:
   - the Travel backend (Supabase-backed)
   - the Donation backend (`POST /api/auth/verify-firebase-token`)
4. Store the backend session/token returned by each backend as required for their protected APIs.
5. Send `Authorization: Bearer <donation-backend-jwt>` only to protected donation endpoints. The Supabase/travel token is not accepted by the donation backend, and vice versa.
6. Fetch `/api/public/donation-heads` at runtime and render the returned multilingual fields, `presetAmounts`, `minAmount`, `subCauses`, and `is80GEligible`.
7. Preserve both the selected public head key and the backend-required `{id,name}` snapshot. Because the current create endpoint does not verify the head against MongoDB, the app should choose the returned record and pass its stable `_id` (or current website-compatible identifier) plus the displayed name; this should be confirmed against the live website payload before release.
8. Create the donation record, then create its Razorpay order. Never put Razorpay secret or Firebase service-account credentials in the app.
9. Open Razorpay using the returned `razorpayOrderId`, `amount`, `currency`, and public `key`. The existing website’s checkout integration should be used as the behavioral reference for the exact React Native Razorpay package/configuration.
10. After checkout, poll status with bounded exponential/backoff intervals. Stop on `SUCCESS`, `FAILED`, or an explicit timeout state; a timeout is not payment failure.
11. On success, use `/api/donations/:id/receipt` as the authoritative receipt download endpoint. Do not rely only on `receiptUrl`, because the history URL is a relative server path and the download endpoint regenerates the file.
12. For signed-in users, use `/api/user/donations` for history and `/api/donations/me/last-profile` for safe auto-fill. Guest users can still retain the donation ID locally for status/receipt access, but the ID behaves like an access token and should be protected.
13. If login is offered, authenticate through Firebase phone auth, exchange the Firebase ID token for the donation backend JWT, and only then call protected donation APIs.

## 7. Missing APIs and minimal additions

The current system is sufficient for a basic mobile donation flow. The following are the minimal gaps or risks worth addressing before production mobile rollout:

### High priority

1. **Order authorization/idempotency:** `POST /api/donations/create-order` should verify the donation is `PENDING`, optionally require that an authenticated user owns it, and reuse or safely replace an existing order. This is a narrow controller guard, not a model redesign.
2. **Donation-head validation at creation:** `create` accepts any non-empty head id/name and does not verify that the head is active or that the name matches the configured `DonationHead`. A minimal server-side lookup by public head key (or a compatibility check against the existing identifier) would prevent stale/tampered cause data.
3. **Status polling contract:** There is no retry-after or server-side status timestamp. The app can poll the existing endpoint, but a small `updatedAt`/payment metadata response would improve recovery. This is optional, not required for initial integration.

### Reasonable but optional

4. **Authenticated receipt endpoint:** Current receipt download is public-by-ID. A protected `GET /api/user/donations/:id/receipt` could verify ownership while preserving the existing public receipt route for website compatibility.
5. **Single donation detail endpoint:** History returns useful data, but there is no authenticated detail endpoint by donation ID. A detail route could provide a stable mobile response, although it is not required because status/history/receipt already cover the core screens.
6. **Webhook reconciliation/admin retry:** There is no user-facing reconciliation endpoint or automatic pending-expiry state. Admin monitoring or a Razorpay reconciliation job would help operationally; it should not be implemented in the mobile app.
7. **Public collector lookup without ID:** `/api/public/referral/:code` already does this and is sufficient. Do not add a duplicate endpoint.

There is no need to add a frontend payment-verification API. Webhook processing is intentionally authoritative.

## 8. Integration roadmap

1. Confirm production donation base URL, `MONGO_URI_SHARED`, Razorpay webhook configuration, receipt hosting, and the missing server-side Firebase service-account file.
2. Capture and type the live response shapes for multilingual donation heads.
3. Implement the donation API client with a separate base URL and separate JWT storage.
4. Fetch active donation heads and render cause/sub-cause details and preset/minimum amounts.
5. Add optional referral-code entry and preview through `GET /api/public/referral/:code`.
6. Implement donor form validation matching backend requirements: INR 10 minimum, adult DOB, PAN format, required address/mobile/name.
7. Call `POST /api/donations/create` and retain the returned donation ID.
8. Call `POST /api/donations/create-order` and open the existing Razorpay checkout flow.
9. Poll `GET /api/donations/:id/status` until `SUCCESS` or `FAILED`; never mark success from the client callback alone.
10. Show receipt number and download/stream `GET /api/donations/:id/receipt` on success.
11. Keep browsing and guest donations available without requiring authentication.
12. Require Firebase Phone Authentication only when the user attempts a protected feature (travel booking, donation history, collector features, profile, etc.).
13. Immediately exchange the Firebase ID token with both the Travel backend and the Donation backend after login so both services establish their own authenticated sessions.
14. Support linking previous guest donations to the authenticated user by matching the verified phone number with existing MongoDB donation records where necessary.
15. Add `/api/user/donations` history and `/api/donations/me/last-profile` auto-fill for authenticated users.
16. Add collector status/application/dashboard screens after the donor flow is complete.
17. Before release, apply the minimal order-authorization and donation-head-validation hardening, then test duplicate webhooks, delayed webhooks, failed payments, guest receipts, anonymous display, invalid referrals, and expired JWTs.

## Source traceability

Primary files inspected in the archive:

- `src/models/Donation.js`
- `src/models/DonationHead.js`
- `src/models/User.js`
- `src/routes/donation.routes.js`
- `src/routes/public.routes.js`
- `src/routes/user.routes.js`
- `src/routes/collector.routes.js`
- `src/routes/referral.routes.js`
- `src/routes/leaderboard.routes.js`
- `src/routes/webhook.routes.js`
- `src/controllers/donation.controller.js`
- `src/controllers/donationHead.controller.js`
- `src/controllers/collector.controller.js`
- `src/controllers/auth.controller.js`
- `src/controllers/webhook.controller.js`
- `src/services/collector.service.js`
- `src/services/receipt.service.js`
- `src/config/db.js`
- `src/config/razorpay.js`
- `src/config/firebaseAdmin.js`
