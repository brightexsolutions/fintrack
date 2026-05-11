-- Subscription tracking
CREATE TABLE public.subscriptions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id   UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description    TEXT,
  amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency       TEXT NOT NULL DEFAULT 'KES',
  billing_cycle  TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_billing_date DATE NOT NULL,
  category_id    UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  url            TEXT,
  color          TEXT NOT NULL DEFAULT '#6366F1',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  reminder_days  INTEGER NOT NULL DEFAULT 3,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_user ON public.subscriptions(user_id, is_active, next_billing_date ASC);
CREATE TRIGGER trg_sub_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_select" ON public.subscriptions FOR SELECT
  USING (user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id)));
CREATE POLICY "sub_insert" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sub_update" ON public.subscriptions FOR UPDATE
  USING (user_id = auth.uid() OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id)));
CREATE POLICY "sub_delete" ON public.subscriptions FOR DELETE USING (user_id = auth.uid());

-- Push notification subscriptions (Web Push)
CREATE TABLE public.push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_select" ON public.push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_insert" ON public.push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_delete" ON public.push_subscriptions FOR DELETE USING (user_id = auth.uid());
