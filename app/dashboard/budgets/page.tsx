'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { BudgetCard } from '@/components/budgets/budget-card'
import { BudgetForm } from '@/components/budgets/budget-form'
import { useBudgets, useDeleteBudget } from '@/hooks/use-budgets'
import { formatKES } from '@/lib/utils'
import type { BudgetProgress } from '@/types/database'

export default function BudgetsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BudgetProgress | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BudgetProgress | null>(null)

  const { data: budgets = [], isLoading } = useBudgets()
  const deleteMutation = useDeleteBudget()

  function handleEdit(b: BudgetProgress) {
    setEditing(b)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditing(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.budget_id)
    setDeleteTarget(null)
  }

  const active = budgets.filter((b) => b.status !== 'paused')
  const paused = budgets.filter((b) => b.status === 'paused')

  const totalBudgeted = active.reduce((s, b) => s + Number(b.budget_amount), 0)
  const totalSpent = active.reduce((s, b) => s + Number(b.spent), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Loading...' : `${active.length} active budget${active.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setEditing(null); setFormOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add budget
        </Button>
      </div>

      {/* Summary strip */}
      {!isLoading && active.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total budgeted', value: formatKES(totalBudgeted) },
            { label: 'Total spent', value: formatKES(totalSpent) },
            { label: 'Remaining', value: formatKES(Math.max(totalBudgeted - totalSpent, 0)) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold text-sm mt-1 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && budgets.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">No budgets yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first budget to start tracking spending.</p>
        </div>
      )}

      {/* Active budgets grid */}
      {!isLoading && active.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((b) => (
            <BudgetCard key={b.budget_id} budget={b} onEdit={handleEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Paused budgets */}
      {!isLoading && paused.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Paused</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
            {paused.map((b) => (
              <BudgetCard key={b.budget_id} budget={b} onEdit={handleEdit} onDelete={setDeleteTarget} />
            ))}
          </div>
        </div>
      )}

      {/* Form dialog */}
      <BudgetForm open={formOpen} onClose={handleClose} editing={editing} />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete budget?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Transactions will not be affected.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
