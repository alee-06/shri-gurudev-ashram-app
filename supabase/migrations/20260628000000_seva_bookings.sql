-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Seva Bookings Table
-- Purpose: Extensible table for all spiritual service bookings.
--          Covers Annadan, Yajman, and future seva types (Gau Seva,
--          Temple Seva, Special Pooja, Event Registration, etc.)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create the seva_bookings table
CREATE TABLE IF NOT EXISTS public.seva_bookings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference   text        NOT NULL UNIQUE,
  user_id             uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Extensible type column: add new values here as new seva types are introduced
  seva_type           text        NOT NULL
                      CHECK (seva_type IN (
                        'annadan',
                        'yajman',
                        'gau_seva',
                        'temple_seva',
                        'special_pooja',
                        'event'
                      )),

  -- The calendar date of the seva (Annadan date / Katha date)
  seva_date           date        NOT NULL,

  -- Devotee / Yajman details
  full_name           text        NOT NULL,
  phone_number        text        NOT NULL,

  -- Financial
  total_amount        numeric     NOT NULL CHECK (total_amount > 0),
  status              text        NOT NULL DEFAULT 'payment_pending'
                      CHECK (status IN ('payment_pending', 'paid', 'cancelled')),

  -- Razorpay fields (populated in Phase 2 when real payment is wired)
  razorpay_order_id   text        UNIQUE,
  razorpay_payment_id text        UNIQUE,
  razorpay_signature  text,

  -- Optional extra info
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.handle_seva_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_seva_booking_updated ON public.seva_bookings;
CREATE TRIGGER on_seva_booking_updated
  BEFORE UPDATE ON public.seva_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seva_updated_at();

-- 3. Row Level Security
ALTER TABLE public.seva_bookings ENABLE ROW LEVEL SECURITY;

-- Users can only read their own seva bookings
DROP POLICY IF EXISTS "seva_bookings_select_own" ON public.seva_bookings;
CREATE POLICY "seva_bookings_select_own"
  ON public.seva_bookings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own seva bookings
DROP POLICY IF EXISTS "seva_bookings_insert_own" ON public.seva_bookings;
CREATE POLICY "seva_bookings_insert_own"
  ON public.seva_bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Useful indexes
CREATE INDEX IF NOT EXISTS seva_bookings_user_id_idx       ON public.seva_bookings (user_id);
CREATE INDEX IF NOT EXISTS seva_bookings_seva_type_idx     ON public.seva_bookings (seva_type);
CREATE INDEX IF NOT EXISTS seva_bookings_seva_date_idx     ON public.seva_bookings (seva_date);
CREATE INDEX IF NOT EXISTS seva_bookings_status_idx        ON public.seva_bookings (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notes for Phase 2 (Real Razorpay integration):
--
-- 1. Create backend route POST /api/seva  → inserts into seva_bookings
-- 2. Create backend route POST /api/payments/create-seva-order
--    → Creates Razorpay order, stores razorpay_order_id on the row
-- 3. Create backend route POST /api/payments/verify-seva
--    → Verifies HMAC, updates razorpay_payment_id, sets status='paid'
-- 4. Update services/seva.ts: replace mock functions with real API calls
-- 5. Update seva-payment.tsx: replace mockPaySevaBooking with real Razorpay flow
--
-- To add future seva types (e.g., 'gau_seva'):
--   ALTER TABLE public.seva_bookings DROP CONSTRAINT seva_bookings_seva_type_check;
--   ALTER TABLE public.seva_bookings ADD CONSTRAINT seva_bookings_seva_type_check
--     CHECK (seva_type IN ('annadan','yajman','gau_seva','temple_seva','special_pooja','event','<new_type>'));
-- ─────────────────────────────────────────────────────────────────────────────
