-- ============================================================
-- FinTrack: Row Level Security Migration 002
-- Run AFTER 001_schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mpesa_imports         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions (SECURITY DEFINER = run as table owner,
-- avoiding infinite recursion in RLS policy evaluation)
-- ============================================================
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_workspace_editor(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin', 'editor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- profiles: own row only
-- ============================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- workspaces: owner full access, members read
-- ============================================================
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid() OR is_workspace_member(id));
CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "workspaces_delete" ON public.workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================================
-- workspace_members: members can see each other, owner manages
-- ============================================================
CREATE POLICY "wm_select" ON public.workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));
CREATE POLICY "wm_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );
CREATE POLICY "wm_update" ON public.workspace_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );
CREATE POLICY "wm_delete" ON public.workspace_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- ============================================================
-- workspace_invitations: inviter manages, invitee reads & accepts
-- ============================================================
CREATE POLICY "inv_select" ON public.workspace_invitations
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR is_workspace_member(workspace_id)
  );
CREATE POLICY "inv_insert" ON public.workspace_invitations
  FOR INSERT WITH CHECK (is_workspace_editor(workspace_id));
CREATE POLICY "inv_update" ON public.workspace_invitations
  FOR UPDATE USING (
    inviter_id = auth.uid()
    OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "inv_delete" ON public.workspace_invitations
  FOR DELETE USING (inviter_id = auth.uid());

-- ============================================================
-- categories: own rows + system defaults (user_id IS NULL)
-- ============================================================
CREATE POLICY "cat_select" ON public.categories
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "cat_insert" ON public.categories
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cat_update" ON public.categories
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "cat_delete" ON public.categories
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- transactions: own rows + workspace member rows
-- ============================================================
CREATE POLICY "tx_select" ON public.transactions
  FOR SELECT USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  );
CREATE POLICY "tx_insert" ON public.transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tx_update" ON public.transactions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );
CREATE POLICY "tx_delete" ON public.transactions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- budgets
-- ============================================================
CREATE POLICY "bud_select" ON public.budgets
  FOR SELECT USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  );
CREATE POLICY "bud_insert" ON public.budgets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bud_update" ON public.budgets
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );
CREATE POLICY "bud_delete" ON public.budgets
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- debts
-- ============================================================
CREATE POLICY "debt_select" ON public.debts
  FOR SELECT USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  );
CREATE POLICY "debt_insert" ON public.debts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "debt_update" ON public.debts
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );
CREATE POLICY "debt_delete" ON public.debts
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- debt_payments
-- ============================================================
CREATE POLICY "dp_select" ON public.debt_payments
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dp_insert" ON public.debt_payments
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "dp_delete" ON public.debt_payments
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- savings_goals
-- ============================================================
CREATE POLICY "sg_select" ON public.savings_goals
  FOR SELECT USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_member(workspace_id))
  );
CREATE POLICY "sg_insert" ON public.savings_goals
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sg_update" ON public.savings_goals
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND is_workspace_editor(workspace_id))
  );
CREATE POLICY "sg_delete" ON public.savings_goals
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- savings_contributions
-- ============================================================
CREATE POLICY "sc_select" ON public.savings_contributions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sc_insert" ON public.savings_contributions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "sc_delete" ON public.savings_contributions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- mpesa_imports: own rows only
-- ============================================================
CREATE POLICY "imp_select" ON public.mpesa_imports
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "imp_insert" ON public.mpesa_imports
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "imp_update" ON public.mpesa_imports
  FOR UPDATE USING (user_id = auth.uid());
