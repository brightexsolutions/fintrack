'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { BudgetProgress } from '@/types/database'
import type { BudgetFormData } from '@/lib/validations/budget'

export function useBudgets(workspaceId?: string | null) {
  return useQuery({
    queryKey: ['budgets', workspaceId ?? 'personal'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('budget_progress')
        .select('*, category:categories(id, name, color, icon)')
        .order('start_date', { ascending: false })

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      } else {
        query = query.eq('user_id', user.id).is('workspace_id', null)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as unknown as BudgetProgress[]
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: BudgetFormData & { workspace_id?: string | null }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('budgets').insert({
        user_id: user.id,
        workspace_id: values.workspace_id ?? null,
        name: values.name,
        category_id: values.category_id || null,
        amount: values.amount,
        period: values.period,
        start_date: values.start_date,
        end_date: values.end_date,
        alerts_enabled: values.alerts_enabled,
        alert_threshold: values.alert_threshold,
        description: values.description || null,
        status: 'active',
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<BudgetFormData> }) => {
      const supabase = createClient()
      const { data, error } = await supabase.from('budgets').update({
        ...values,
        category_id: values.category_id || null,
        description: values.description || null,
      }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Budget deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
