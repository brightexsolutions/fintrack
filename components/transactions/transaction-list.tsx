'use client'

import { useState } from 'react'
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatKES, formatDate } from '@/lib/utils'
import { useDeleteTransaction } from '@/hooks/use-transactions'
import type { Transaction } from '@/types/database'

interface TransactionListProps {
  transactions: Transaction[]
  loading?: boolean
  onEdit: (tx: Transaction) => void
}

export function TransactionList({ transactions, loading, onEdit }: TransactionListProps) {
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const deleteMutation = useDeleteTransaction()

  async function confirmDelete() {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground text-sm">No transactions found.</p>
        <p className="text-xs text-muted-foreground mt-1">Adjust your filters or add a new transaction.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              {tx.type === 'income'
                ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                : <ArrowDownRight className="h-4 w-4 text-red-500" />
              }
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{tx.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</span>
                {tx.category && (
                  <Badge
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-4 rounded-full"
                    style={{ backgroundColor: `${tx.category.color}20`, color: tx.category.color }}
                  >
                    {tx.category.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{tx.payment_method}</span>
                {tx.mpesa_ref && (
                  <span className="text-xs text-muted-foreground font-mono">{tx.mpesa_ref}</span>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2 shrink-0">
              <p className={`text-sm font-semibold tabular-nums ${
                tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
              }`}>
                {tx.type === 'income' ? '+' : '-'}{formatKES(tx.amount)}
              </p>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted">
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => onEdit(tx)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(tx)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.description}&rdquo; — {deleteTarget ? formatKES(deleteTarget.amount) : ''} will be permanently deleted.
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
    </>
  )
}
