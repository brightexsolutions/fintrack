'use client'

import { MoreHorizontal, Pencil, Trash2, PlusCircle, Phone, Mail, Calendar, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { daysUntil } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import type { Debt } from '@/types/database'

interface DebtCardProps {
  debt: Debt
  onEdit: (d: Debt) => void
  onDelete: (d: Debt) => void
  onLogPayment: (d: Debt) => void
}

export function DebtCard({ debt, onEdit, onDelete, onLogPayment }: DebtCardProps) {
  const { format } = useCurrency()
  const paidPct = Math.min((debt.amount_paid / debt.amount) * 100, 100)
  const remaining = debt.amount - debt.amount_paid
  const isPaid = debt.status === 'paid'
  const isOverdue = !isPaid && debt.due_date && daysUntil(debt.due_date) < 0

  const days = debt.due_date ? daysUntil(debt.due_date) : null

  const statusConfig = {
    active: { label: 'Active', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' },
    partially_paid: { label: 'Partial', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' },
    paid: { label: 'Paid', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' },
    cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
  }[debt.status]

  return (
    <div className={`rounded-xl border border-border bg-card p-4 space-y-3 transition-opacity ${isPaid ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{debt.contact_name}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{debt.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className={`text-[10px] px-1.5 h-5 ${statusConfig.className}`}>
            {isPaid && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
            {statusConfig.label}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {!isPaid && (
                <>
                  <DropdownMenuItem onClick={() => onLogPayment(debt)}>
                    <PlusCircle className="h-3.5 w-3.5 mr-2" /> Log payment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onEdit(debt)}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(debt)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Amounts */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold tabular-nums text-sm">{format(debt.amount_paid)}</span>
          <span className="text-muted-foreground tabular-nums">of {format(debt.amount)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isPaid ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${paidPct}%` }}
          />
        </div>
        {!isPaid && (
          <p className="text-xs text-muted-foreground text-right tabular-nums">
            {format(remaining)} remaining
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          {debt.contact_phone && (
            <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{debt.contact_phone}</span>
          )}
          {debt.contact_email && !debt.contact_phone && (
            <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{debt.contact_email}</span>
          )}
        </div>
        {debt.due_date && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            <Calendar className="h-2.5 w-2.5" />
            {isOverdue
              ? `${Math.abs(days!)}d overdue`
              : days === 0
                ? 'Due today'
                : `${days}d left`}
          </span>
        )}
      </div>
    </div>
  )
}
