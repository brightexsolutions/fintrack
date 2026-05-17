'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Debt } from '@/types/database'
import type { DebtFormData, DebtPaymentFormData } from '@/lib/validations/debt'

export function useDebts(workspaceId?: string | null) {
  return useQuery({
    queryKey: ['debts', workspaceId ?? 'personal'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('debts')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId)
      } else {
        query = query.eq('user_id', user.id).is('workspace_id', null)
      }

      const { data, error } = await query

      if (error) throw error
      return (data ?? []) as Debt[]
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: DebtFormData & { workspace_id?: string | null }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('debts').insert({
        user_id: user.id,
        workspace_id: values.workspace_id ?? null,
        type: values.type,
        contact_name: values.contact_name,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        amount: values.amount,
        description: values.description,
        due_date: values.due_date || null,
        notes: values.notes || null,
        currency: 'KES',
        status: 'active',
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Debt recorded')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<DebtFormData> }) => {
      const supabase = createClient()
      const { data, error } = await supabase.from('debts').update({
        ...values,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        due_date: values.due_date || null,
        notes: values.notes || null,
      }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Debt updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Debt deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useLogDebtPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ debtId, values }: { debtId: string; values: DebtPaymentFormData }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('debt_payments').insert({
        debt_id: debtId,
        user_id: user.id,
        amount: values.amount,
        note: values.note || null,
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Payment logged')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
