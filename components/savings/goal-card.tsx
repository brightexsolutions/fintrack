'use client'

import { MoreHorizontal, Pencil, Trash2, PlusCircle, Calendar, Trophy } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, daysUntil } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import type { SavingsGoal } from '@/types/database'

interface GoalCardProps {
  goal: SavingsGoal
  onEdit: (g: SavingsGoal) => void
  onDelete: (g: SavingsGoal) => void
  onContribute: (g: SavingsGoal) => void
}

export function GoalCard({ goal, onEdit, onDelete, onContribute }: GoalCardProps) {
  const { format } = useCurrency()
  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  const isCompleted = goal.status === 'completed'
  const days = goal.target_date ? daysUntil(goal.target_date) : null
  const isOverdue = days !== null && days < 0 && !isCompleted

  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-3 transition-opacity ${goal.status === 'cancelled' ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isCompleted && <Trophy className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            <p className="font-medium text-sm truncate">{goal.name}</p>
          </div>
          {goal.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{goal.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {!isCompleted && goal.status !== 'cancelled' && (
              <>
                <DropdownMenuItem onClick={() => onContribute(goal)}>
                  <PlusCircle className="h-3.5 w-3.5 mr-2" /> Contribute
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(goal)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-semibold text-base tabular-nums">{format(goal.current_amount)}</p>
            <p className="text-xs text-muted-foreground">of {format(goal.target_amount)}</p>
          </div>
          <p className={`text-sm font-medium tabular-nums ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
            {pct.toFixed(1)}%
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isCompleted ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      {goal.target_date && (
        <div className={`flex items-center gap-1 text-xs pt-1 border-t border-border/50 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
          <Calendar className="h-3 w-3" />
          {isCompleted
            ? `Completed · Target was ${formatDate(goal.target_date)}`
            : isOverdue
              ? `${Math.abs(days!)}d overdue · ${formatDate(goal.target_date)}`
              : days === 0
                ? 'Due today'
                : `${days}d left · ${formatDate(goal.target_date)}`}
        </div>
      )}

      {isCompleted && !goal.target_date && (
        <div className="flex items-center gap-1 text-xs pt-1 border-t border-border/50 text-emerald-600 dark:text-emerald-400 font-medium">
          <Trophy className="h-3 w-3" /> Goal reached!
        </div>
      )}
    </div>
  )
}
