'use client'

import { MoreHorizontal, Pencil, Trash2, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import type { BudgetProgress } from '@/types/database'

interface BudgetCardProps {
  budget: BudgetProgress
  onEdit: (b: BudgetProgress) => void
  onDelete: (b: BudgetProgress) => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { format } = useCurrency()
  const pct = Math.min(Number(budget.percentage), 100)
  const isExceeded = budget.is_exceeded
  const isWarning = !isExceeded && Number(budget.percentage) >= Number(budget.alert_threshold)

  const barColor = isExceeded
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  const statusConfig = isExceeded
    ? { label: 'Exceeded', variant: 'destructive' as const, icon: AlertTriangle }
    : isWarning
      ? { label: 'Warning', variant: 'secondary' as const, icon: AlertTriangle }
      : { label: 'On track', variant: 'secondary' as const, icon: CheckCircle2 }

  const StatusIcon = statusConfig.icon

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{budget.name}</p>
            {budget.category && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style={{ backgroundColor: `${budget.category.color}20`, color: budget.category.color }}
              >
                {budget.category.name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{budget.period}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant={statusConfig.variant}
            className={`text-xs px-1.5 py-0 h-5 gap-1 ${
              isExceeded ? '' : isWarning ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400'
            }`}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {statusConfig.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(budget)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium tabular-nums">{format(budget.spent)}</span>
          <span className="text-muted-foreground tabular-nums">of {format(budget.budget_amount)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {Number(budget.percentage).toFixed(1)}% used
          </span>
          <span>{isExceeded ? `${format(Math.abs(budget.remaining))} over` : `${format(budget.remaining)} left`}</span>
        </div>
      </div>

      {/* Date range */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
        <span>{formatDate(budget.start_date)}</span>
        <span>→</span>
        <span>{formatDate(budget.end_date)}</span>
      </div>
    </div>
  )
}
