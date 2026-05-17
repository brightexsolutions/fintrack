'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function RealtimeSync({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('fintrack-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['insight_transactions'] })
        queryClient.invalidateQueries({ queryKey: ['monthly_trend'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard_month_transactions'] })
        queryClient.invalidateQueries({ queryKey: ['budgets'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['budgets'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['debts'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['savings_goals'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        queryClient.invalidateQueries({ queryKey: ['workspace_members'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_invitations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['workspace_invitations'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return null
}

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeSync queryClient={queryClient} />
      {children}
    </QueryClientProvider>
  )
}
