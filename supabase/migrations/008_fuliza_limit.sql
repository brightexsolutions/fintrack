-- Add Fuliza overdraft limit to profiles.
-- NULL means the user hasn't set it (unknown or opted out).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fuliza_limit NUMERIC DEFAULT NULL;
