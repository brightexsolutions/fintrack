'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Transaction } from '@/types/database'
import type { TransactionFormData } from '@/lib/validations/transaction'

export interface TransactionFilters {
  type?: 'income' | 'expense' | 'all'
  category_id?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  workspace_id?: string | null // null = personal only, string = workspace
}

function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: ['insight_transactions'] })
  queryClient.invalidateQueries({ queryKey: ['monthly_trend'] })
  queryClient.invalidateQueries({ queryKey: ['budgets'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard_month_transactions'] })
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('transactions')
        .select('*, category:categories(id, name, color, icon)')
        .order('transaction_date', { ascending: false })

      // Workspace mode: show workspace transactions; Personal mode: show own transactions
      if (filters.workspace_id) {
        query = query.eq('workspace_id', filters.workspace_id)
      } else {
        query = query.eq('user_id', user.id).is('workspace_id', null)
      }

      if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)
      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Transaction[]
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: TransactionFormData & { workspace_id?: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('transactions').insert({
        user_id: user.id,
        workspace_id: values.workspace_id ?? null,
        type: values.type,
        amount: values.amount,
        description: values.description,
        category_id: values.category_id || null,
        payment_method: values.payment_method,
        transaction_date: new Date(values.transaction_date).toISOString(),
        notes: values.notes || null,
        status: values.status,
        currency: 'KES',
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient)
      toast.success('Transaction added')
      // Fire budget alert check in background (non-blocking)
      fetch('/api/push/budget-alert', { method: 'POST' }).catch(() => {})
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<TransactionFormData> }) => {
      const supabase = createClient()
      const { data, error } = await supabase.from('transactions').update({
        ...values,
        category_id: values.category_id || null,
        notes: values.notes || null,
        transaction_date: values.transaction_date ? new Date(values.transaction_date).toISOString() : undefined,
      }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient)
      toast.success('Transaction updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidateFinanceQueries(queryClient)
      toast.success('Transaction deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export { useCategories } from '@/hooks/use-categories'
