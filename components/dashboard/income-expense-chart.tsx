'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format, parseISO } from 'date-fns'

interface MonthlyData {
  month: string
  income: number
  expenses: number
}

interface IncomeExpenseChartProps {
  data: MonthlyData[]
  loading?: boolean
}

function formatY(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
  return String(value)
}

export function IncomeExpenseChart({ data, loading }: IncomeExpenseChartProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : data.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
            Add transactions to see your chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  try { return format(parseISO(`${v}-01`), 'MMM') } catch { return v }
                }}
                className="text-muted-foreground"
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatY} className="text-muted-foreground" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
                      <p className="font-medium mb-1">{label}</p>
                      {payload.map((p) => (
                        <p key={p.name} style={{ color: p.color }}>
                          {p.name === 'income' ? 'Income' : 'Expenses'}: Ksh {Number(p.value).toLocaleString()}
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Bar dataKey="income"   name="income"   fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="expenses" name="expenses" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
