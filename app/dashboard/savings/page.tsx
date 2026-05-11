'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { GoalCard } from '@/components/savings/goal-card'
import { GoalForm } from '@/components/savings/goal-form'
import { ContributionForm } from '@/components/savings/contribution-form'
import { useSavingsGoals, useDeleteSavingsGoal } from '@/hooks/use-savings'
import { useCurrency } from '@/hooks/use-currency'
import type { SavingsGoal } from '@/types/database'

export default function SavingsPage() {
  const { format } = useCurrency()
  const [formOpen, setFormOpen] = useState(false)
  const [contributeTarget, setContributeTarget] = useState<SavingsGoal | null>(null)
  const [editing, setEditing] = useState<SavingsGoal | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null)

  const { data: goals = [], isLoading } = useSavingsGoals()
  const deleteMutation = useDeleteSavingsGoal()

  const active = goals.filter((g) => g.status === 'active')
  const completed = goals.filter((g) => g.status === 'completed')

  const totalSaved = active.reduce((s, g) => s + Number(g.current_amount), 0)
  const totalTarget = active.reduce((s, g) => s + Number(g.target_amount), 0)

  function handleEdit(g: SavingsGoal) {
    setEditing(g)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditing(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Savings Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? 'Loading...' : `${active.length} active goal${active.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setEditing(null); setFormOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> New goal
        </Button>
      </div>

      {/* Summary strip */}
      {!isLoading && active.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total saved', value: format(totalSaved) },
            { label: 'Total target', value: format(totalTarget) },
            { label: 'Still needed', value: format(Math.max(totalTarget - totalSaved, 0)) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold text-sm mt-1 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && goals.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">No savings goals yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create a goal to start saving towards something.</p>
        </div>
      )}

      {/* Active goals */}
      {!isLoading && active.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} onContribute={setContributeTarget} />
          ))}
        </div>
      )}

      {/* Completed goals */}
      {!isLoading && completed.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Completed</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={handleEdit} onDelete={setDeleteTarget} onContribute={setContributeTarget} />
            ))}
          </div>
        </div>
      )}

      <GoalForm open={formOpen} onClose={handleClose} editing={editing} />
      <ContributionForm open={!!contributeTarget} onClose={() => setContributeTarget(null)} goal={contributeTarget} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete goal?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; and all contribution history will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
