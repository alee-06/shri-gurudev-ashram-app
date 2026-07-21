# IMPLEMENTATION.md — Shri Gurudev Ashram App

**Purpose:** This is the operating protocol for implementation work on this repo. It converts `AUDIT.md` into an ordered, actionable backlog, and defines exactly how `AUDIT.md` must be updated after every piece of work so it stays a trustworthy, live progress tracker — not stale documentation.

Give this file (plus the current `AUDIT.md`) to Antigravity at the start of every session.

---

## 0. Non-negotiable Operating Rules

1. **One task at a time.** Pick a single Task ID from the backlog below (Section 3), implement it fully, then stop and update `AUDIT.md` before starting another. Do not bundle multiple tasks into one session unless they're explicitly grouped as a single task.
2. **No silent scope creep.** If you notice an unrelated bug, mock, or missing piece while working, do NOT fix it inline. Add it to the "Newly Discovered Items" log in `AUDIT.md` (Section 2 below) and leave it for a future task.
3. **No status inflation.** A phase/task is only marked ✅ Complete if it is actually wired end-to-end (UI → service → backend/DB, where applicable) and you can point to the file(s) that prove it. If only partially done, it stays 🟡 and the remaining gap must be stated explicitly.
4. **No invented percentages.** Recompute completion percentages using the method in Section 2.3 — never eyeball a new number.
5. **Ask before assuming product decisions.** Items like "should donation use MongoDB or Supabase," "is OTP required for launch," "is multi-traveler in scope" are product decisions, not engineering ones. If the backlog task depends on an undecided product question, flag it and pause rather than guessing.
6. **Every session ends with an `AUDIT.md` update.** Even if a task is only partially finished when the session ends, update `AUDIT.md` to reflect the real partial state — never leave it describing pre-session reality.
7. **Do not touch code outside the current task's stated scope.** No drive-by refactors, no dependency upgrades, no style pass "while I'm in here."

---

## 1. Session Workflow

For every session:

1. **Read** the current `AUDIT.md` in full — it is the source of truth for what's actually built, not this backlog (this backlog may drift from reality as tasks complete; `AUDIT.md`'s per-phase detail always wins).
2. **Select** the next task from Section 3 (respect dependencies).
3. **Restate** the task's Definition of Done back before writing code, so scope is explicit.
4. **Implement** only what's needed to satisfy the Definition of Done.
5. **Verify**: run `npm run typecheck`, and any relevant manual check listed in the task. Note results.
6. **Update `AUDIT.md`** per the protocol in Section 2.
7. **Report**: summarize what changed, what's still open, and which files were touched.

---

## 2. AUDIT.md Update Protocol

### 2.1 What to update per task

For the phase(s) affected by the task, update in `AUDIT.md`:

- The phase's **Status** and **Completion %** (recompute — see 2.3).
- Move relevant bullet points from "Missing" to "Completed" (with file path citations), or add a new bullet if the task introduced something not previously listed.
- Update the **Integration Map** row(s) for that feature if frontend/backend/database state changed.
- Update the **Final Completion Summary** table row for that phase, and recompute Frontend/Backend/Deployment/Overall completion (2.3).
- If the task closes an item in "Top Remaining Tasks Before Deployment," check it off (strike through or mark done) rather than deleting it — keep it as a record.

### 2.2 Session Log (append-only)

Add a new `## Session Log` section at the bottom of `AUDIT.md` if it doesn't exist yet. Append one entry per session, never edit past entries:

```
### Session — <date> — <commit hash if available>
Task: <Task ID> — <short description>
Changed: <file paths touched>
AUDIT sections updated: <phase names>
Status change: <e.g. "Phase 7 Donation: 45% -> 61%">
Newly discovered items: <any new gaps found, or "none">
Open follow-ups: <anything left incomplete for a future session>
```

### 2.3 How to recompute percentages (do not eyeball)

For a phase's completion %:
- List every "Completed" and "Missing" bullet for that phase after the task.
- % = (count of Completed items) / (count of Completed + Missing items), weighted toward end-to-end items (UI-only counts as half-credit if backend/DB wiring for that same item is still missing).
- State the count used, e.g. "9 of 12 sub-items complete (75%)" — so the number is auditable, not vibes.

For Frontend / Backend / Deployment / Overall completion: average the relevant phase percentages (Frontend = UI-facing phases; Backend = Phases 12–14; Deployment = Phase 16; Overall = simple average of all phase %s). State the phases included in the average.

If you cannot confidently justify a percentage this way, write "Unable to verify — insufficient evidence" rather than posting a number.

### 2.4 Newly Discovered Items log

Add a `## Newly Discovered Items` section (if not present) to hold anything found mid-task that's out of scope for the current task. Format:

```
- [ ] <short description> — found during <Task ID> — <file path> — suggested phase: <phase name>
```

These get triaged into the backlog (Section 3 below) at the start of the next planning pass — they are not auto-fixed.

---

## 3. Implementation Backlog

Derived from `AUDIT.md`'s "Top Remaining Tasks Before Deployment," ordered by dependency and risk. Each task lists: what it touches, Definition of Done, and which `AUDIT.md` phase(s) it updates.

**Priority tiers:** 🔴 Blocking for any real launch · 🟠 Needed before public/store launch · 🟡 Post-launch acceptable

### 🔴 T1 — Production environment & config audit
- **Depends on:** nothing
- **Touches:** `.env.development`, production env setup, `app.json`, Razorpay keys, Supabase project settings
- **Definition of Done:** Documented (not necessarily created, since prod secrets aren't in-repo) list of every env var/key needed for production, cross-checked against what's used in code. Confirm `google-services.json` is present or explicitly flagged as missing.
- **Updates:** Phase 0, Phase 16, Security Audit (Phase 14)
- **Note:** This is largely a verification/documentation task, not a code task — don't fabricate production credentials.

### 🔴 T2 — Decide & implement donation backend integration
- **Depends on:** Product decision: Supabase vs. MongoDB/website backend for donations
- **Touches:** `src/screens/donation/DonationScreen.tsx`, new donation service, backend donation routes, Razorpay order/verify for donations, receipt generation
- **Definition of Done:** Donation flow creates a real order via Razorpay, verifies payment server-side (same signature-verification pattern as `backend/src/routes/payments.ts`), persists the donation record, and generates a receipt. "Coming Soon" alert removed.
- **Updates:** Phase 7, Integration Map, Backend Integration Audit (Phase 12), Database Audit (Phase 13)

### 🔴 T3 — Replace seva mock services with real backend
- **Depends on:** T2's Razorpay pattern (reuse it)
- **Touches:** `src/services/seva.ts` (currently explicitly "Phase 1 (Mock)"), new backend seva routes, wiring to existing `seva_bookings` Supabase migration
- **Definition of Done:** Annadan and Guruji Aarti/Yajman booking, availability, and payment go through real backend + `seva_bookings` table instead of local mock data. Receipts remain (already working).
- **Updates:** Phase 8, Integration Map, Backend Integration Audit (Phase 12)

### 🟠 T4 — Phone/OTP authentication (or explicit decision to skip)
- **Depends on:** Product decision: is OTP required for launch, or is email/password acceptable?
- **Touches:** `src/services/auth.ts`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, Supabase `signInWithOtp`
- **Definition of Done:** Either OTP login is implemented end-to-end, or `AUDIT.md` explicitly records the decision to launch with email/password and closes this as "Won't Do — decided."
- **Updates:** Phase 1

### 🟠 T5 — Travel module: multi-traveler details & documents
- **Depends on:** Product decision: is multi-traveler support in scope for launch?
- **Touches:** `src/features/bookings/BookingForm.tsx`, `app/verify-identity.tsx`, backend booking/verification routes
- **Definition of Done:** Booking form supports per-traveler details and document upload when traveler count > 1, or this is explicitly deferred with a note in `AUDIT.md`.
- **Updates:** Phase 5, Phase 6

### 🟠 T6 — Travel receipt component
- **Depends on:** nothing
- **Touches:** new travel receipt component (reuse pattern from `src/components/SevaReceipt.tsx`), success/booking-detail screens
- **Definition of Done:** Travel booking success screen and booking detail generate a shareable receipt, matching the seva receipt pattern.
- **Updates:** Phase 5, Receipt System (already documented under Phase 5/10, confirm cross-reference)

### 🟠 T7 — Identity verification storage hardening
- **Depends on:** nothing
- **Touches:** `backend/src/middleware/upload.ts`, `backend/src/routes/users.ts`
- **Definition of Done:** Either migrate Aadhaar/selfie uploads to Supabase Storage (matching the pattern used for `profile-images`) with access controls documented, or explicitly document the local-multer approach as an accepted production risk with mitigation notes.
- **Updates:** Phase 6, Security Audit (Phase 14)

### 🟠 T8 — Collector module backend (referrals, tracking, leaderboard, receipts)
- **Depends on:** Product decision: is Collector module in scope for launch, or post-launch?
- **Touches:** new backend collector routes, new DB tables, `app/collector-dashboard.tsx`, `src/components/CollectorIDCard.tsx`
- **Definition of Done:** Either full backend wiring for referral tracking, donation tracking, leaderboard, and receipts, or explicit "deferred post-launch" decision recorded.
- **Updates:** Phase 9, Integration Map

### 🟠 T9 — Lock collector routes behind role check
- **Depends on:** nothing
- **Touches:** `app/(tabs)/home.tsx` (collector card), `app/collector-dashboard.tsx`, `app/collector-verification.tsx`
- **Definition of Done:** All collector routes verify `role === 'collector'` at the route level, not just from the profile entry point.
- **Updates:** Phase 9, Security Audit (Phase 14)

### 🟠 T10 — Clean up placeholder/dead UI
- **Depends on:** nothing
- **Touches:** `app/(tabs)/home.tsx` drawer items (Gallery, Shop), `CustomTabBar`/`AppTabBar`/`FloatingDonateButton` duplication, `app/(tabs)/donate.tsx` redirect alias
- **Definition of Done:** Either implement the placeholder drawer destinations or remove them; consolidate to a single tab-bar/donate-button component; remove or justify the donate route alias.
- **Updates:** Phase 2, Phase 3, Phase 4, Build Quality Audit (Phase 15)

### 🟡 T11 — Keyboard/back-navigation QA pass
- **Depends on:** nothing (but do after T5/T6 to avoid re-testing)
- **Touches:** `src/features/bookings/BookingForm.tsx` (add `KeyboardAvoidingView`), travel/seva back-navigation flows
- **Definition of Done:** Manual QA pass on device/simulator confirming keyboard behavior and back-navigation across booking, upload, and payment screens; fixes applied where broken.
- **Updates:** Phase 5, Phase 6, UI/UX checklist

### 🟡 T12 — Centralize design tokens
- **Depends on:** nothing, best done after major feature work (T2, T3) to avoid rebase pain
- **Touches:** shared style/theme file, screens with hardcoded `StyleSheet` colors
- **Definition of Done:** Colors/spacing/typography pulled from a single theme source; hardcoded duplicate values in screens replaced.
- **Updates:** Phase 3, Build Quality Audit (Phase 15)

### 🟡 T13 — Multilingual support (i18n)
- **Depends on:** Product decision: required for launch or post-launch?
- **Touches:** new `src/locales/` (en, hi, mr), i18n library integration, language selector, persistence
- **Definition of Done:** Either full i18n coverage or explicit "post-launch" decision recorded.
- **Updates:** Phase 11

### 🟡 T14 — Lint + test scaffolding
- **Depends on:** nothing
- **Touches:** `package.json` scripts, ESLint config, a minimal test suite (auth, booking creation, payment verification, critical stores)
- **Definition of Done:** `npm run lint` and `npm test` exist and pass with at least smoke coverage on the four critical paths listed.
- **Updates:** Build Quality Audit (Phase 15)

### 🟡 T15 — Android build & store readiness
- **Depends on:** T1 (env/config), ideally after T2/T3/T4 decisions are locked
- **Touches:** `eas.json`, `app.json` splash config, store assets, privacy policy, support contact placeholders
- **Definition of Done:** A real EAS preview/production build succeeds, is smoke-tested on a device, and store metadata (icons, splash, support contact, privacy policy) is finalized.
- **Updates:** Phase 16, Branding

---

## 4. Definition of "Done" for the whole project

The project is launch-ready when every 🔴 and 🟠 task above is either Complete or has an explicit, recorded product decision to defer it — and `AUDIT.md`'s Overall Completion reflects that with evidence, not estimation. 🟡 tasks are nice-to-have and can trail post-launch.

---

## 5. How to hand this to Antigravity

Paste this file plus the current `AUDIT.md` at the start of a session, then say which Task ID to work on (or ask Antigravity to recommend the next task based on dependencies and priority tier). Do not let it pick multiple tasks or expand scope mid-session — hold it to Section 0's rules.
