'use client'

import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { formatKES, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/database'

interface RecentTransactionsProps {
  transactions: Transaction[]
  loading?: boolean
}

export function RecentTransactions({ transactions, loading }: RecentTransactionsProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
        <Link href="/dashboard/transactions">
          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No transactions yet.{' '}
            <Link href="/dashboard/transactions" className="text-emerald-600 hover:underline">
              Add your first one
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                }`}>
                  {tx.type === 'income'
                    ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    : <ArrowDownRight className="h-4 w-4 text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
                    {tx.category && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4" style={{ backgroundColor: `${tx.category.color}20`, color: tx.category.color }}>
                        {tx.category.name}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                  tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatKES(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
