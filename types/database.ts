export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// ============================================================
// Enums
// ============================================================
export type TransactionType   = 'income' | 'expense'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled'
export type BudgetPeriod      = 'weekly' | 'monthly' | 'yearly'
export type BudgetStatus      = 'active' | 'paused' | 'exceeded'
export type WorkspaceRole     = 'owner' | 'admin' | 'editor' | 'viewer'
export type InvitationStatus  = 'pending' | 'accepted' | 'declined' | 'expired'
export type DebtType          = 'owed_to_me' | 'i_owe'
export type DebtStatus        = 'active' | 'partially_paid' | 'paid' | 'cancelled'
export type GoalStatus        = 'active' | 'completed' | 'cancelled'
export type CategoryType      = 'income' | 'expense' | 'both'

// ============================================================
// Table row types
// ============================================================
export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  preferred_currency: string
  timezone: string
  notification_prefs: {
    budget_alerts: boolean
    weekly_digest: boolean
    payment_reminders: boolean
  }
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  owner_id: string
  currency: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  is_active: boolean
  joined_at: string
}

export interface WorkspaceInvitation {
  id: string
  workspace_id: string
  inviter_id: string
  invitee_email: string
  role: WorkspaceRole
  status: InvitationStatus
  message: string | null
  token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  type: CategoryType
  icon: string
  color: string
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  workspace_id: string | null
  type: TransactionType
  amount: number
  currency: string
  category_id: string | null
  description: string
  notes: string | null
  payment_method: string
  status: TransactionStatus
  transaction_date: string
  receipt_url: string | null
  mpesa_ref: string | null
  counterparty: string | null
  balance_after: number | null
  mpesa_import_id: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
}

export interface Budget {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  category_id: string | null
  amount: number
  period: BudgetPeriod
  status: BudgetStatus
  start_date: string
  end_date: string
  alerts_enabled: boolean
  alert_threshold: number
  description: string | null
  created_at: string
  updated_at: string
  // joined
  category?: Category
}

export interface BudgetProgress {
  budget_id: string
  user_id: string
  workspace_id: string | null
  name: string
  budget_amount: number
  period: BudgetPeriod
  status: BudgetStatus
  start_date: string
  end_date: string
  alerts_enabled: boolean
  alert_threshold: number
  category_id: string | null
  spent: number
  remaining: number
  percentage: number
  is_exceeded: boolean
  category?: Category
}

export interface Debt {
  id: string
  user_id: string
  workspace_id: string | null
  type: DebtType
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  amount: number
  amount_paid: number
  currency: string
  description: string
  due_date: string | null
  status: DebtStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  user_id: string
  amount: number
  note: string | null
  paid_at: string
  created_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  description: string | null
  target_amount: number
  current_amount: number
  currency: string
  target_date: string | null
  status: GoalStatus
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface SavingsContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note: string | null
  contributed_at: string
  created_at: string
}

export interface MpesaImport {
  id: string
  user_id: string
  raw_sms_batch: string
  total_sms_count: number
  parsed_count: number
  failed_count: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  parse_errors: Array<{ line: number; error: string }>
  transactions_created: number
  created_at: string
}

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Subscription {
  id: string
  user_id: string
  workspace_id: string | null
  name: string
  description: string | null
  amount: number
  currency: string
  billing_cycle: BillingCycle
  next_billing_date: string
  category_id: string | null
  url: string | null
  color: string
  is_active: boolean
  reminder_days: number
  created_at: string
  updated_at: string
  category?: Category | null
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth_key: string
  created_at: string
}

// ============================================================
// Supabase Database type (used by createClient generic)
// ============================================================
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile>; Relationships: [] }
      workspaces: { Row: Workspace; Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Workspace>; Relationships: [] }
      workspace_members: { Row: WorkspaceMember; Insert: Omit<WorkspaceMember, 'id' | 'joined_at'>; Update: Partial<WorkspaceMember>; Relationships: [] }
      workspace_invitations: { Row: WorkspaceInvitation; Insert: Omit<WorkspaceInvitation, 'id' | 'token' | 'created_at' | 'updated_at'>; Update: Partial<WorkspaceInvitation>; Relationships: [] }
      categories: { Row: Category; Insert: Omit<Category, 'id' | 'created_at'>; Update: Partial<Category>; Relationships: [] }
      transactions: { Row: Transaction; Insert: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category'>; Update: Partial<Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category'>>; Relationships: [] }
      budgets: { Row: Budget; Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'category'>; Update: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'category'>>; Relationships: [] }
      debts: { Row: Debt; Insert: Omit<Debt, 'id' | 'amount_paid' | 'created_at' | 'updated_at'>; Update: Partial<Debt>; Relationships: [] }
      debt_payments: { Row: DebtPayment; Insert: Omit<DebtPayment, 'id' | 'created_at'>; Update: Partial<DebtPayment>; Relationships: [] }
      savings_goals: { Row: SavingsGoal; Insert: Omit<SavingsGoal, 'id' | 'current_amount' | 'created_at' | 'updated_at'>; Update: Partial<SavingsGoal>; Relationships: [] }
      savings_contributions: { Row: SavingsContribution; Insert: Omit<SavingsContribution, 'id' | 'created_at'>; Update: Partial<SavingsContribution>; Relationships: [] }
      mpesa_imports: { Row: MpesaImport; Insert: Omit<MpesaImport, 'id' | 'created_at'>; Update: Partial<MpesaImport>; Relationships: [] }
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'category'>; Update: Partial<Omit<Subscription, 'id' | 'created_at' | 'updated_at' | 'category'>>; Relationships: [] }
      push_subscriptions: { Row: PushSubscription; Insert: Omit<PushSubscription, 'id' | 'created_at'>; Update: Partial<PushSubscription>; Relationships: [] }
    }
    Views: {
      budget_progress: { Row: BudgetProgress; Relationships: [] }
    }
    Functions: Record<string, never>
    Enums: {
      transaction_type: TransactionType
      transaction_status: TransactionStatus
      budget_period: BudgetPeriod
      budget_status: BudgetStatus
      workspace_role: WorkspaceRole
      invitation_status: InvitationStatus
      debt_type: DebtType
      debt_status: DebtStatus
      goal_status: GoalStatus
      category_type: CategoryType
    }
  }
}
