'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { SavingsGoal } from '@/types/database'
import type { SavingsGoalFormData, ContributionFormData } from '@/lib/validations/savings'

export function useSavingsGoals() {
  return useQuery({
    queryKey: ['savings_goals'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as SavingsGoal[]
    },
  })
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: SavingsGoalFormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('savings_goals').insert({
        user_id: user.id,
        name: values.name,
        description: values.description || null,
        target_amount: values.target_amount,
        target_date: values.target_date || null,
        currency: 'KES',
        status: 'active',
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] })
      toast.success('Savings goal created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<SavingsGoalFormData> }) => {
      const supabase = createClient()
      const { data, error } = await supabase.from('savings_goals').update({
        ...values,
        description: values.description || null,
        target_date: values.target_date || null,
      }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] })
      toast.success('Goal updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('savings_goals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] })
      toast.success('Goal deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAddContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, values }: { goalId: string; values: ContributionFormData }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('savings_contributions').insert({
        goal_id: goalId,
        user_id: user.id,
        amount: values.amount,
        note: values.note || null,
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] })
      toast.success('Contribution added')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
