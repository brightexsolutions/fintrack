'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type MatchField = 'counterparty' | 'description' | 'any'

export interface CategorizationRule {
  id: string
  user_id: string
  keyword: string
  category_id: string
  match_field: MatchField
  created_at: string
}

export interface CategorizationRuleFormData {
  keyword: string
  category_id: string
  match_field: MatchField
}

export function useCategorizationRules() {
  return useQuery({
    queryKey: ['categorization_rules'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data, error } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as CategorizationRule[]
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateCategorizationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CategorizationRuleFormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('categorization_rules').insert({
        user_id: user.id,
        keyword: values.keyword.trim(),
        category_id: values.category_id,
        match_field: values.match_field,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization_rules'] })
      toast.success('Rule added')
    },
    onError: () => toast.error('Failed to add rule'),
  })
}

export function useDeleteCategorizationRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('categorization_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorization_rules'] })
      toast.success('Rule removed')
    },
    onError: () => toast.error('Failed to remove rule'),
  })
}
