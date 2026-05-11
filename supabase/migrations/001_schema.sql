-- ============================================================
-- FinTrack: Schema Migration 001
-- Run in Supabase SQL Editor FIRST
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE transaction_type   AS ENUM ('income', 'expense');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE budget_period      AS ENUM ('weekly', 'monthly', 'yearly');
CREATE TYPE budget_status      AS ENUM ('active', 'paused', 'exceeded');
CREATE TYPE workspace_role     AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE invitation_status  AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE debt_type          AS ENUM ('owed_to_me', 'i_owe');
CREATE TYPE debt_status        AS ENUM ('active', 'partially_paid', 'paid', 'cancelled');
CREATE TYPE goal_status        AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE category_type      AS ENUM ('income', 'expense', 'both');

-- ============================================================
-- SHARED TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT NOT NULL UNIQUE,
  full_name            TEXT NOT NULL DEFAULT '',
  avatar_url           TEXT,
  preferred_currency   TEXT NOT NULL DEFAULT 'KES',
  timezone             TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  notification_prefs   JSONB NOT NULL DEFAULT '{"budget_alerts":true,"weekly_digest":true,"payment_reminders":true}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- workspaces
-- ============================================================
CREATE TABLE public.workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description TEXT,
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency    TEXT NOT NULL DEFAULT 'KES',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- workspace_members
-- ============================================================
CREATE TABLE public.workspace_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         workspace_role NOT NULL DEFAULT 'viewer',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);
CREATE INDEX idx_wm_workspace ON public.workspace_members(workspace_id);
CREATE INDEX idx_wm_user      ON public.workspace_members(user_id);

-- ============================================================
-- workspace_invitations
-- ============================================================
CREATE TABLE public.workspace_invitations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  inviter_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  role          workspace_role NOT NULL DEFAULT 'viewer',
  status        invitation_status NOT NULL DEFAULT 'pending',
  message       TEXT,
  token         TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_email  ON public.workspace_invitations(invitee_email);
CREATE INDEX idx_inv_token  ON public.workspace_invitations(token);
CREATE INDEX idx_inv_status ON public.workspace_invitations(status);
CREATE TRIGGER trg_inv_updated_at
  BEFORE UPDATE ON public.workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- categories  (user_id NULL = system default)
-- ============================================================
CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  type       category_type NOT NULL DEFAULT 'expense',
  icon       TEXT NOT NULL DEFAULT 'circle',
  color      TEXT NOT NULL DEFAULT '#6366F1',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cat_user ON public.categories(user_id);

-- ============================================================
-- mpesa_imports  (declared before transactions for FK)
-- ============================================================
CREATE TABLE public.mpesa_imports (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  raw_sms_batch        TEXT NOT NULL,
  total_sms_count      INTEGER NOT NULL DEFAULT 0,
  parsed_count         INTEGER NOT NULL DEFAULT 0,
  failed_count         INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','processing','completed','failed')),
  parse_errors         JSONB DEFAULT '[]'::jsonb,
  transactions_created INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_imports_user ON public.mpesa_imports(user_id, created_at DESC);

-- ============================================================
-- transactions
-- ============================================================
CREATE TABLE public.transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id     UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  type             transaction_type NOT NULL,
  amount           NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency         TEXT NOT NULL DEFAULT 'KES',
  category_id      UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description      TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  notes            TEXT,
  payment_method   TEXT NOT NULL DEFAULT 'M-Pesa',
  status           transaction_status NOT NULL DEFAULT 'completed',
  transaction_date TIMESTAMPTZ NOT NULL,
  receipt_url      TEXT,
  mpesa_ref        TEXT,
  counterparty     TEXT,
  balance_after    NUMERIC(15,2),
  mpesa_import_id  UUID REFERENCES public.mpesa_imports(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tx_user      ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_tx_workspace ON public.transactions(workspace_id, transaction_date DESC)
  WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_tx_category  ON public.transactions(category_id);
CREATE INDEX idx_tx_mpesa_ref ON public.transactions(mpesa_ref)
  WHERE mpesa_ref IS NOT NULL;
CREATE INDEX idx_tx_desc_trgm ON public.transactions USING gin(description gin_trgm_ops);
CREATE TRIGGER trg_tx_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- budgets
-- ============================================================
CREATE TABLE public.budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id    UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  period          budget_period NOT NULL DEFAULT 'monthly',
  status          budget_status NOT NULL DEFAULT 'active',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  alerts_enabled  BOOLEAN NOT NULL DEFAULT true,
  alert_threshold NUMERIC(5,2) NOT NULL DEFAULT 80
                  CHECK (alert_threshold BETWEEN 0 AND 100),
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX idx_bud_user      ON public.budgets(user_id, status, start_date DESC);
CREATE INDEX idx_bud_workspace ON public.budgets(workspace_id, status)
  WHERE workspace_id IS NOT NULL;
CREATE TRIGGER trg_bud_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Budget progress VIEW (computed — no sync bugs)
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
  AND t.transaction_date::date BETWEEN b.start_date AND b.end_date
  AND (
    (b.workspace_id IS NULL     AND t.user_id = b.user_id)
    OR (b.workspace_id IS NOT NULL AND t.workspace_id = b.workspace_id)
  )
GROUP BY b.id;

-- ============================================================
-- debts
-- ============================================================
CREATE TABLE public.debts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  type         debt_type NOT NULL,
  contact_name TEXT NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 100),
  contact_email TEXT,
  contact_phone TEXT,
  amount        NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  amount_paid   NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  currency      TEXT NOT NULL DEFAULT 'KES',
  description   TEXT NOT NULL,
  due_date      DATE,
  status        debt_status NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount_paid <= amount)
);
CREATE INDEX idx_debt_user ON public.debts(user_id, status, due_date ASC NULLS LAST);
CREATE INDEX idx_debt_ws   ON public.debts(workspace_id, status)
  WHERE workspace_id IS NOT NULL;
CREATE TRIGGER trg_debt_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- debt_payments
-- ============================================================
CREATE TABLE public.debt_payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id    UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  note       TEXT,
  paid_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dp_debt ON public.debt_payments(debt_id, paid_at DESC);

CREATE OR REPLACE FUNCTION sync_debt_amount_paid()
RETURNS TRIGGER AS $$
DECLARE v_total NUMERIC(15,2); v_target NUMERIC(15,2);
BEGIN
  SELECT COALESCE(SUM(dp.amount), 0), d.amount
    INTO v_total, v_target
    FROM public.debt_payments dp
    JOIN public.debts d ON d.id = dp.debt_id
   WHERE dp.debt_id = COALESCE(NEW.debt_id, OLD.debt_id)
   GROUP BY d.amount;
  UPDATE public.debts
  SET amount_paid = v_total,
      status = CASE
        WHEN v_total >= v_target THEN 'paid'::debt_status
        WHEN v_total > 0         THEN 'partially_paid'::debt_status
        ELSE 'active'::debt_status
      END,
      updated_at = now()
  WHERE id = COALESCE(NEW.debt_id, OLD.debt_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_debt_payments
  AFTER INSERT OR DELETE ON public.debt_payments
  FOR EACH ROW EXECUTE FUNCTION sync_debt_amount_paid();

-- ============================================================
-- savings_goals
-- ============================================================
CREATE TABLE public.savings_goals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id   UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description    TEXT,
  target_amount  NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  currency       TEXT NOT NULL DEFAULT 'KES',
  target_date    DATE,
  status         goal_status NOT NULL DEFAULT 'active',
  image_url      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sg_user ON public.savings_goals(user_id, status, target_date ASC NULLS LAST);
CREATE TRIGGER trg_sg_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- savings_contributions
-- ============================================================
CREATE TABLE public.savings_contributions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id        UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount         NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  note           TEXT,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sc_goal ON public.savings_contributions(goal_id, contributed_at DESC);

CREATE OR REPLACE FUNCTION sync_goal_current_amount()
RETURNS TRIGGER AS $$
DECLARE v_total NUMERIC(15,2); v_target NUMERIC(15,2);
BEGIN
  SELECT COALESCE(SUM(sc.amount), 0), g.target_amount
    INTO v_total, v_target
    FROM public.savings_contributions sc
    JOIN public.savings_goals g ON g.id = sc.goal_id
   WHERE sc.goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
   GROUP BY g.target_amount;
  UPDATE public.savings_goals
  SET current_amount = v_total,
      status = CASE
        WHEN v_total >= v_target THEN 'completed'::goal_status
        ELSE status
      END,
      updated_at = now()
  WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_contributions
  AFTER INSERT OR DELETE ON public.savings_contributions
  FOR EACH ROW EXECUTE FUNCTION sync_goal_current_amount();
