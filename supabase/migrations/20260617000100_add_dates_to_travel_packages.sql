ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL;

ALTER TABLE public.travel_packages
  ADD COLUMN IF NOT EXISTS end_date date DEFAULT NULL;
