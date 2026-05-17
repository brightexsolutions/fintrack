-- FinTrack production readiness updates

-- M-Pesa import metadata for scoped imports and clearer summaries
ALTER TABLE public.mpesa_imports
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duplicate_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS import_summary JSONB;

CREATE INDEX IF NOT EXISTS idx_imports_workspace
  ON public.mpesa_imports(workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

-- Delivery log used by cron jobs to avoid duplicate reminder/digest emails
CREATE TABLE IF NOT EXISTS public.communication_deliveries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  delivery_type TEXT NOT NULL,
  target_ref    TEXT NOT NULL,
  sent_for_date DATE NOT NULL,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(channel, delivery_type, user_id, target_ref, sent_for_date)
);

ALTER TABLE public.communication_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comm_delivery_select_own" ON public.communication_deliveries
  FOR SELECT USING (user_id = auth.uid());

-- Prevent duplicate M-Pesa refs within the same personal scope or workspace scope
CREATE OR REPLACE FUNCTION public.prevent_duplicate_mpesa_refs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mpesa_ref IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.mpesa_ref = NEW.mpesa_ref
      AND t.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (
        (NEW.workspace_id IS NULL AND t.workspace_id IS NULL AND t.user_id = NEW.user_id)
        OR (NEW.workspace_id IS NOT NULL AND t.workspace_id = NEW.workspace_id)
      )
  ) THEN
    RAISE EXCEPTION 'Duplicate M-Pesa reference already exists in this scope';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tx_prevent_duplicate_mpesa_ref ON public.transactions;

CREATE TRIGGER trg_tx_prevent_duplicate_mpesa_ref
  BEFORE INSERT OR UPDATE OF mpesa_ref, workspace_id, user_id
  ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_mpesa_refs();

-- Tighten workspace insert/delete policies to match editor permissions
DROP POLICY IF EXISTS "tx_insert" ON public.transactions;
CREATE POLICY "tx_insert" ON public.transactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "tx_delete" ON public.transactions;
CREATE POLICY "tx_delete" ON public.transactions
  FOR DELETE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "bud_insert" ON public.budgets;
CREATE POLICY "bud_insert" ON public.budgets
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "bud_delete" ON public.budgets;
CREATE POLICY "bud_delete" ON public.budgets
  FOR DELETE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "debt_insert" ON public.debts;
CREATE POLICY "debt_insert" ON public.debts
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "debt_delete" ON public.debts;
CREATE POLICY "debt_delete" ON public.debts
  FOR DELETE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "sg_insert" ON public.savings_goals;
CREATE POLICY "sg_insert" ON public.savings_goals
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "sg_delete" ON public.savings_goals;
CREATE POLICY "sg_delete" ON public.savings_goals
  FOR DELETE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "sub_insert" ON public.subscriptions;
CREATE POLICY "sub_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "sub_delete" ON public.subscriptions;
CREATE POLICY "sub_delete" ON public.subscriptions
  FOR DELETE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );

DROP POLICY IF EXISTS "imp_insert" ON public.mpesa_imports;
CREATE POLICY "imp_insert" ON public.mpesa_imports
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id IS NULL OR is_workspace_editor(workspace_id))
  );
