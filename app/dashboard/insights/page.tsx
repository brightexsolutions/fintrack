'use client'

import { useState, useMemo } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import {
  useInsightTransactions, useMonthlyTrend,
  buildSummary, buildCategoryBreakdown, buildDailyTrend,
  type InsightFilters,
} from '@/hooks/use-insights'
import { useCurrency } from '@/hooks/use-currency'

const PRESET_RANGES = [
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Last 3 months', value: 'last_3_months' },
  { label: 'Last 6 months', value: 'last_6_months' },
  { label: 'This year', value: 'this_year' },
]

function getFiltersFromPreset(preset: string): InsightFilters {
  const now = new Date()
  switch (preset) {
    case 'last_month': {
      const lm = subMonths(now, 1)
      return { dateFrom: format(startOfMonth(lm), 'yyyy-MM-dd'), dateTo: format(endOfMonth(lm), 'yyyy-MM-dd') }
    }
    case 'last_3_months':
      return { dateFrom: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'), dateTo: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'last_6_months':
      return { dateFrom: format(startOfMonth(subMonths(now, 5)), 'yyyy-MM-dd'), dateTo: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'this_year':
      return { dateFrom: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'), dateTo: format(endOfMonth(now), 'yyyy-MM-dd') }
    default: // this_month
      return { dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), dateTo: format(endOfMonth(now), 'yyyy-MM-dd') }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function KesTooltip({ active, payload, label }: any) {
  const { format: fmtAmount } = useCurrency()
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="font-medium ml-auto pl-4">{fmtAmount(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function InsightsPage() {
  const [preset, setPreset] = useState('this_month')
  const [activeCategory, setActiveCategory] = useState<'income' | 'expense'>('expense')
  const { format: fmtAmount } = useCurrency()

  const filters = useMemo(() => getFiltersFromPreset(preset), [preset])

  const { data: transactions = [], isLoading } = useInsightTransactions(filters)
  const { data: monthlyTrend = [], isLoading: trendLoading } = useMonthlyTrend()

  const summary = useMemo(() => buildSummary(transactions), [transactions])
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(transactions, activeCategory), [transactions, activeCategory])
  const dailyTrend = useMemo(() => buildDailyTrend(transactions), [transactions])

  const summaryCards = [
    {
      label: 'Total Income',
      value: summary.totalIncome,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
      trend: ArrowUpRight,
      trendColor: 'text-emerald-600',
    },
    {
      label: 'Total Expenses',
      value: summary.totalExpenses,
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      trend: ArrowDownRight,
      trendColor: 'text-red-500',
    },
    {
      label: 'Net Savings',
      value: summary.netSavings,
      icon: PiggyBank,
      color: summary.netSavings >= 0 ? 'text-blue-600' : 'text-red-500',
      bg: summary.netSavings >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10',
      trend: summary.netSavings >= 0 ? ArrowUpRight : ArrowDownRight,
      trendColor: summary.netSavings >= 0 ? 'text-blue-600' : 'text-red-500',
    },
    {
      label: 'Savings Rate',
      value: null,
      displayValue: `${summary.savingsRate.toFixed(1)}%`,
      icon: Wallet,
      color: 'text-purple-600',
      bg: 'bg-purple-500/10',
      trend: null,
      trendColor: '',
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Understand your financial patterns</p>
        </div>
        <Select value={preset} onValueChange={(v) => v && setPreset(v)}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESET_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon
          const TrendIcon = card.trend
          return (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                {TrendIcon && (
                  <TrendIcon className={`h-4 w-4 ${card.trendColor}`} />
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-24 mb-1" />
              ) : (
                <p className={`text-lg font-bold tabular-nums ${card.color}`}>
                  {card.displayValue ?? fmtAmount(card.value ?? 0)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Daily cash flow bar chart */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Daily Cash Flow</h2>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : dailyTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyTrend} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
              <Tooltip content={<KesTooltip />} />
              <Bar dataKey="income" name="income" fill="#10B981" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" name="expenses" fill="#EF4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 6-month trend */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">6-Month Trend</h2>
        {trendLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
              <Tooltip content={<KesTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="income" name="income" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="expenses" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="net" name="net savings" stroke="#6366F1" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Category breakdown */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Category Breakdown</h2>
          <div className="flex rounded-md border border-border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-3 text-xs rounded-none border-0 ${activeCategory === 'expense' ? 'bg-muted' : ''}`}
              onClick={() => setActiveCategory('expense')}
            >
              Expenses
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-3 text-xs rounded-none border-0 border-l border-border ${activeCategory === 'income' ? 'bg-muted' : ''}`}
              onClick={() => setActiveCategory('income')}
            >
              Income
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-56 w-full" />
        ) : categoryBreakdown.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No {activeCategory} data for this period</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryBreakdown.slice(0, 8)}
                  dataKey="total"
                  nameKey="category_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {categoryBreakdown.slice(0, 8).map((entry, i) => (
                    <Cell key={i} fill={entry.category_color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => fmtAmount(Number(value))}
                  contentStyle={{ fontSize: 11, borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="w-full md:w-56 shrink-0 space-y-1.5">
              {categoryBreakdown.slice(0, 8).map((cat) => {
                const total = activeCategory === 'expense' ? summary.totalExpenses : summary.totalIncome
                const pct = total > 0 ? (cat.total / total) * 100 : 0
                return (
                  <div key={cat.category_id ?? 'uncat'} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: cat.category_color }} />
                        <span className="truncate">{cat.category_name}</span>
                      </div>
                      <span className="tabular-nums text-muted-foreground ml-2 shrink-0">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.category_color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Month-over-month table */}
      {!trendLoading && monthlyTrend.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold">Month-over-Month</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Month</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Income</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Expenses</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrend.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="p-3 font-medium">{row.month}</td>
                    <td className="p-3 text-right tabular-nums text-emerald-600">{fmtAmount(row.income)}</td>
                    <td className="p-3 text-right tabular-nums text-red-500">{fmtAmount(row.expenses)}</td>
                    <td className={`p-3 text-right tabular-nums font-medium ${row.net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {row.net >= 0 ? '+' : ''}{fmtAmount(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
