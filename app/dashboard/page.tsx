import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import type { Transaction } from '@/types/database'

type TxRow = { type: string; amount: number }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  // Current month transactions with category join
  const { data: rawTx } = await supabase
    .from('transactions')
    .select(`
      id, type, amount, currency, description, transaction_date, payment_method,
      status, mpesa_ref, counterparty, category_id,
      category:categories(id, name, color, icon)
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('transaction_date', monthStart)
    .lte('transaction_date', monthEnd)
    .order('transaction_date', { ascending: false })

  const monthTx = (rawTx ?? []) as unknown as Transaction[]

  const totalIncome   = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpenses = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const recent        = monthTx.slice(0, 8)

  // Last 6 months for chart (sequential to reuse single client)
  const chartData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      return {
        month: format(d, 'yyyy-MM'),
        start: startOfMonth(d).toISOString(),
        end:   endOfMonth(d).toISOString(),
      }
    }).map(async ({ month, start, end }) => {
      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('transaction_date', start)
        .lte('transaction_date', end)

      const rows = (data ?? []) as TxRow[]
      const income   = rows.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expenses = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      return { month, income, expenses }
    })
  )

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{format(now, 'MMMM yyyy')} overview</p>
      </div>

      <SummaryCards totalIncome={totalIncome} totalExpenses={totalExpenses} />

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <IncomeExpenseChart data={chartData} />
        </div>
        <div className="lg:col-span-2">
          <RecentTransactions transactions={recent} />
        </div>
      </div>
    </div>
  )
}
