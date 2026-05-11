'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types/database'
import { startOfMonth, endOfMonth, subMonths, format, parseISO, startOfDay, endOfDay } from 'date-fns'

export interface InsightFilters {
  dateFrom: string
  dateTo: string
  workspace_id?: string | null
}

export interface MonthlyTrend {
  month: string
  income: number
  expenses: number
  net: number
}

export interface CategoryBreakdown {
  category_id: string | null
  category_name: string
  category_color: string
  total: number
  count: number
}

export interface InsightSummary {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
  transactionCount: number
  avgTransactionAmount: number
}

export function useInsightTransactions(filters: InsightFilters) {
  return useQuery({
    queryKey: ['insight_transactions', filters],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('transactions')
        .select('*, category:categories(id, name, color, icon)')
        .eq('status', 'completed')
        .gte('transaction_date', startOfDay(parseISO(filters.dateFrom)).toISOString())
        .lte('transaction_date', endOfDay(parseISO(filters.dateTo)).toISOString())
        .order('transaction_date', { ascending: true })

      if (filters.workspace_id) {
        query = query.eq('workspace_id', filters.workspace_id)
      } else {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as Transaction[]
    },
    enabled: !!filters.dateFrom && !!filters.dateTo,
    staleTime: 60 * 1000,
  })
}

export function useMonthlyTrend(workspaceId?: string | null) {
  return useQuery({
    queryKey: ['monthly_trend', workspaceId ?? 'personal'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Last 6 months
      const months: MonthlyTrend[] = []
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i)
        const from = startOfMonth(d).toISOString()
        const to = endOfMonth(d).toISOString()

        let q = supabase
          .from('transactions')
          .select('type, amount')
          .eq('status', 'completed')
          .gte('transaction_date', from)
          .lte('transaction_date', to)

        if (workspaceId) {
          q = q.eq('workspace_id', workspaceId)
        } else {
          q = q.eq('user_id', user.id)
        }

        const { data } = await q
        const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const expenses = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

        months.push({
          month: format(d, 'MMM yyyy'),
          income,
          expenses,
          net: income - expenses,
        })
      }
      return months
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function buildSummary(transactions: Transaction[]): InsightSummary {
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const net = income - expenses
  const savingsRate = income > 0 ? (net / income) * 100 : 0
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0)

  return {
    totalIncome: income,
    totalExpenses: expenses,
    netSavings: net,
    savingsRate,
    transactionCount: transactions.length,
    avgTransactionAmount: transactions.length > 0 ? total / transactions.length : 0,
  }
}

export function buildCategoryBreakdown(transactions: Transaction[], type: 'income' | 'expense'): CategoryBreakdown[] {
  const filtered = transactions.filter((t) => t.type === type)
  const map = new Map<string, CategoryBreakdown>()

  for (const t of filtered) {
    const cat = t.category as { id: string; name: string; color: string } | null
    const key = cat?.id ?? 'uncategorized'
    const existing = map.get(key)
    if (existing) {
      existing.total += Number(t.amount)
      existing.count++
    } else {
      map.set(key, {
        category_id: cat?.id ?? null,
        category_name: cat?.name ?? 'Uncategorized',
        category_color: cat?.color ?? '#6B7280',
        total: Number(t.amount),
        count: 1,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export function buildDailyTrend(transactions: Transaction[]): { date: string; income: number; expenses: number }[] {
  const map = new Map<string, { income: number; expenses: number }>()

  for (const t of transactions) {
    const day = format(parseISO(t.transaction_date), 'MMM d')
    const existing = map.get(day) ?? { income: 0, expenses: 0 }
    if (t.type === 'income') existing.income += Number(t.amount)
    else existing.expenses += Number(t.amount)
    map.set(day, existing)
  }

  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }))
}
