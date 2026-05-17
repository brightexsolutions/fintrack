-- User-defined keyword → category auto-categorization rules
-- Checked before system rules in lib/mpesa/auto-categorize.ts

CREATE TABLE IF NOT EXISTS public.categorization_rules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword      TEXT NOT NULL,
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  match_field  TEXT NOT NULL DEFAULT 'counterparty',  -- 'counterparty' | 'description' | 'any'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own categorization rules"
  ON public.categorization_rules
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS categorization_rules_user_idx
  ON public.categorization_rules (user_id);
