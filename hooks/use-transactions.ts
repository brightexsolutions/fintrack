'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Transaction, Category } from '@/types/database'
import type { TransactionFormData } from '@/lib/validations/transaction'

export interface TransactionFilters {
  type?: 'income' | 'expense' | 'all'
  category_id?: string
  search?: string
  dateFrom?: string
  dateTo?: string
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
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type)
      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo)
      if (filters.search) query = query.ilike('description', `%${filters.search}%`)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Transaction[]
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: TransactionFormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.from('transactions').insert({
        user_id: user.id,
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transaction added')
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Transaction deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${user.id}`)
        .order('sort_order')
      if (error) throw error
      return (data ?? []) as Category[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
