'use client'

import { Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFinanceScope } from '@/hooks/use-finance-scope'

export function PersonalOnlyNotice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const { activeWorkspace, switchToPersonal } = useFinanceScope()

  return (
    <div className="max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
          <Lock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Workspace mode is currently focused on shared transactions, dashboard, insights, and M-Pesa import.
            {activeWorkspace ? ` You are viewing ${activeWorkspace.name}.` : ''}
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={switchToPersonal}>
            <User className="mr-2 h-4 w-4" />
            Switch to personal
          </Button>
        </div>
      </div>
    </div>
  )
}
