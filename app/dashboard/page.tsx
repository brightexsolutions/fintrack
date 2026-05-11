'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { useTransactions } from '@/hooks/use-transactions'
import { useMonthlyTrend } from '@/hooks/use-insights'

export default function DashboardPage() {
  const now = new Date()

  // All-time transactions — used for balance, totals, and recent list
  const { data: allTx = [], isLoading: allLoading } = useTransactions()

  const { data: chartData = [], isLoading: chartLoading } = useMonthlyTrend()

  const completedTx = useMemo(
    () => allTx.filter((t) => t.status === 'completed'),
    [allTx]
  )

  const totalBalance = useMemo(
    () => completedTx.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0),
    [completedTx]
  )

  const totalIncome = useMemo(
    () => completedTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    [completedTx]
  )

  const totalExpenses = useMemo(
    () => completedTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    [completedTx]
  )

  const recent = useMemo(
    () => completedTx.slice(0, 8),
    [completedTx]
  )

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{format(now, 'MMMM yyyy')} overview</p>
      </div>

      <SummaryCards
        totalBalance={totalBalance}
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
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
