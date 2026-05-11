'use client'

import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatKES } from '@/lib/utils'

interface SummaryCardsProps {
  totalIncome: number
  totalExpenses: number
  loading?: boolean
}

export function SummaryCards({ totalIncome, totalExpenses, loading }: SummaryCardsProps) {
  const balance = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0

  const cards = [
    {
      label: 'Total Balance',
      value: formatKES(balance),
      icon: Wallet,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      valueColor: balance >= 0 ? 'text-foreground' : 'text-destructive',
    },
    {
      label: 'Monthly Income',
      value: formatKES(totalIncome),
      icon: ArrowUpRight,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      valueColor: 'text-foreground',
    },
    {
      label: 'Monthly Expenses',
      value: formatKES(totalExpenses),
      icon: ArrowDownRight,
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      valueColor: 'text-foreground',
    },
    {
      label: 'Savings Rate',
      value: `${savingsRate.toFixed(1)}%`,
      icon: TrendingUp,
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-500',
      valueColor: savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{card.label}</p>
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className={`text-lg sm:text-xl font-bold ${card.valueColor} tabular-nums`}>{card.value}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
