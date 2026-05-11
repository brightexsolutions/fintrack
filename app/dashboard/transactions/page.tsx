'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionFiltersBar } from '@/components/transactions/transaction-filters'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { useTransactions } from '@/hooks/use-transactions'
import type { TransactionFilters } from '@/hooks/use-transactions'
import type { Transaction } from '@/types/database'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWorkspaces, useWorkspaceMembers } from '@/hooks/use-workspace'

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all' })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const { activeWorkspaceId } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId)

  // Build user_id → profile map for workspace "added by" display
  const { data: wsMembers = [] } = useWorkspaceMembers(activeWorkspaceId)
  const memberMap = useMemo(() => {
    if (!activeWorkspaceId) return undefined
    const map = new Map<string, { name: string; email: string }>()
    wsMembers.forEach((m) => {
      if (m.profile) map.set(m.user_id, { name: m.profile.full_name, email: m.profile.email })
    })
    return map
  }, [wsMembers, activeWorkspaceId])

  const { data: transactions = [], isLoading } = useTransactions({
    ...filters,
    workspace_id: activeWorkspaceId ?? undefined,
  })

  function handleEdit(tx: Transaction) {
    setEditing(tx)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeWs ? <span className="text-emerald-600 font-medium">{activeWs.name}</span> : 'Personal'}{' · '}
            {isLoading ? 'Loading...' : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { setEditing(null); setFormOpen(true) }}
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add transaction
        </Button>
      </div>

      {/* Filters */}
      <TransactionFiltersBar filters={filters} onChange={setFilters} />

      {/* List */}
      <TransactionList
        transactions={transactions}
        loading={isLoading}
        onEdit={handleEdit}
        memberMap={memberMap}
      />

      {/* Form dialog */}
      <TransactionForm open={formOpen} onClose={handleClose} editing={editing} />
    </div>
  )
}
