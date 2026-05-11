'use client'

import { useMemo } from 'react'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { useTransactions } from '@/hooks/use-transactions'
import { useMonthlyTrend } from '@/hooks/use-insights'

export default function DashboardPage() {
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  // All-time transactions for balance + recent list
  const { data: allTx = [], isLoading: allLoading } = useTransactions()

  // Current-month transactions for monthly income/expense cards
  const { data: monthTx = [] } = useTransactions({
    dateFrom: monthStart,
    dateTo: monthEnd,
  })

  const { data: chartData = [], isLoading: chartLoading } = useMonthlyTrend()

  const totalBalance = useMemo(
    () => allTx
      .filter((t) => t.status === 'completed')
      .reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0),
    [allTx]
  )

  const monthlyIncome = useMemo(
    () => monthTx.filter((t) => t.status === 'completed' && t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    [monthTx]
  )

  const monthlyExpenses = useMemo(
    () => monthTx.filter((t) => t.status === 'completed' && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    [monthTx]
  )

  const recent = useMemo(
    () => allTx.filter((t) => t.status === 'completed').slice(0, 8),
    [allTx]
  )

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{format(now, 'MMMM yyyy')} overview</p>
      </div>

      <SummaryCards
        totalBalance={totalBalance}
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        loading={allLoading}
      />

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <IncomeExpenseChart data={chartData} loading={chartLoading} />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactions transactions={recent} loading={allLoading} />
        </div>
      </div>
    </div>
  )
}
