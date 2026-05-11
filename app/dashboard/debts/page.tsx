'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DebtCard } from '@/components/debts/debt-card'
import { DebtForm } from '@/components/debts/debt-form'
import { PaymentForm } from '@/components/debts/payment-form'
import { useDebts, useDeleteDebt } from '@/hooks/use-debts'
import { useCurrency } from '@/hooks/use-currency'
import type { Debt } from '@/types/database'

type TabType = 'i_owe' | 'owed_to_me'

export default function DebtsPage() {
  const { format } = useCurrency()
  const [tab, setTab] = useState<TabType>('i_owe')
  const [formOpen, setFormOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<Debt | null>(null)
  const [editing, setEditing] = useState<Debt | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Debt | null>(null)

  const { data: debts = [], isLoading } = useDebts()
  const deleteMutation = useDeleteDebt()

  const filtered = debts.filter((d) => d.type === tab)
  const activeDebts = filtered.filter((d) => d.status !== 'paid' && d.status !== 'cancelled')
  const settledDebts = filtered.filter((d) => d.status === 'paid' || d.status === 'cancelled')

  const totalOwed = activeDebts.reduce((s, d) => s + (d.amount - d.amount_paid), 0)

  function handleEdit(d: Debt) {
    setEditing(d)
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
          <h1 className="text-xl font-bold">Debts</h1>
          {!isLoading && activeDebts.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {tab === 'i_owe' ? 'You owe' : 'You are owed'} {format(totalOwed)} total
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setEditing(null); setFormOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add debt
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border p-1 bg-muted/30 w-fit gap-1">
        {([['i_owe', 'I Owe'], ['owed_to_me', 'Owed to Me']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {!isLoading && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({debts.filter((d) => d.type === value && d.status !== 'paid' && d.status !== 'cancelled').length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {tab === 'i_owe' ? 'No debts recorded.' : 'Nobody owes you anything.'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Add a debt to start tracking.</p>
        </div>
      )}

      {/* Active */}
      {!isLoading && activeDebts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeDebts.map((d) => (
            <DebtCard key={d.id} debt={d} onEdit={handleEdit} onDelete={setDeleteTarget} onLogPayment={setPaymentTarget} />
          ))}
        </div>
      )}

      {/* Settled */}
      {!isLoading && settledDebts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Settled</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {settledDebts.map((d) => (
              <DebtCard key={d.id} debt={d} onEdit={handleEdit} onDelete={setDeleteTarget} onLogPayment={setPaymentTarget} />
            ))}
          </div>
        </div>
      )}

      <DebtForm open={formOpen} onClose={handleClose} defaultType={tab} editing={editing} />
      <PaymentForm open={!!paymentTarget} onClose={() => setPaymentTarget(null)} debt={paymentTarget} />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete debt?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Debt with &ldquo;{deleteTarget?.contact_name}&rdquo; and all payment history will be permanently deleted.
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
