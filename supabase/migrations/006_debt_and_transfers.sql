-- FinTrack: Debt modeling & transfer tracking
-- Run AFTER 005_production_readiness.sql

-- Add M-Pesa metadata columns to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS mpesa_type         TEXT,
  ADD COLUMN IF NOT EXISTS fuliza_outstanding NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS is_transfer        BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tx_is_transfer
  ON public.transactions(user_id, is_transfer, transaction_date DESC)
  WHERE is_transfer = true;

-- Update budget_progress view to exclude internal transfers
CREATE OR REPLACE VIEW public.budget_progress AS
SELECT
  b.id              AS budget_id,
  b.user_id,
  b.workspace_id,
  b.name,
  b.amount          AS budget_amount,
  b.period,
  b.status,
  b.start_date,
  b.end_date,
  b.alerts_enabled,
  b.alert_threshold,
  b.category_id,
  COALESCE(SUM(t.amount), 0)                                         AS spent,
  GREATEST(b.amount - COALESCE(SUM(t.amount), 0), 0)                AS remaining,
  CASE WHEN b.amount > 0
    THEN ROUND((COALESCE(SUM(t.amount), 0) / b.amount) * 100, 2)
    ELSE 0
  END                                                                AS percentage,
  COALESCE(SUM(t.amount), 0) > b.amount                             AS is_exceeded
FROM public.budgets b
LEFT JOIN public.transactions t
  ON  t.category_id = b.category_id
  AND t.type = 'expense'
  AND t.status = 'completed'
  AND t.is_transfer IS NOT TRUE
  AND t.transaction_date::date BETWEEN b.start_date AND b.end_date
  AND (
    (b.workspace_id IS NULL     AND t.user_id = b.user_id)
    OR (b.workspace_id IS NOT NULL AND t.workspace_id = b.workspace_id)
  )
GROUP BY b.id;

-- Add a source_tag to debts so we can find the Fuliza debt by tag
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS source_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_debts_source_tag
  ON public.debts(user_id, source_tag)
  WHERE source_tag IS NOT NULL;

-- Categories: soft delete support
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cat_deleted_at
  ON public.categories(deleted_at)
  WHERE deleted_at IS NOT NULL;
