'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Subscription } from '@/types/database'
import type { SubscriptionFormData } from '@/lib/validations/subscription'
import { addDays, addWeeks, addMonths, addQuarters, addYears, parseISO, format } from 'date-fns'

function nextBillingDate(current: string, cycle: string): string {
  const d = parseISO(current)
  switch (cycle) {
    case 'weekly':    return format(addWeeks(d, 1), 'yyyy-MM-dd')
    case 'monthly':   return format(addMonths(d, 1), 'yyyy-MM-dd')
    case 'quarterly': return format(addQuarters(d, 1), 'yyyy-MM-dd')
    case 'yearly':    return format(addYears(d, 1), 'yyyy-MM-dd')
    default:          return format(addMonths(d, 1), 'yyyy-MM-dd')
  }
}

// Unused but exported for future use
export { nextBillingDate }
export function isDueSoon(dateStr: string, days: number): boolean {
  const due = parseISO(dateStr)
  const threshold = addDays(new Date(), days)
  return due <= threshold
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, category:categories(id, name, color, icon)')
        .eq('user_id', user.id)
        .order('next_billing_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as Subscription[]
    },
    staleTime: 30 * 1000,
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: SubscriptionFormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          name: values.name,
          description: values.description || null,
          amount: values.amount,
          billing_cycle: values.billing_cycle,
          next_billing_date: values.next_billing_date,
          category_id: values.category_id || null,
          url: values.url || null,
          color: values.color,
          reminder_days: values.reminder_days,
          currency: 'KES',
        })
        .select()
        .single()
      if (error) throw error
      return data as Subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription added')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<SubscriptionFormData> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          ...values,
          category_id: values.category_id || null,
          url: values.url || null,
          description: values.description || null,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Subscription
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('subscriptions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Subscription removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useMarkPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, currentDate, cycle }: { id: string; currentDate: string; cycle: string }) => {
      const supabase = createClient()
      const next = nextBillingDate(currentDate, cycle)
      const { error } = await supabase
        .from('subscriptions')
        .update({ next_billing_date: next })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      toast.success('Marked as paid — next date updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
