'use client'

import { useState } from 'react'
import { Plus, X, ArrowLeftRight, Smartphone } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TransactionForm } from '@/components/transactions/transaction-form'

export function QuickActionFab() {
  const [open, setOpen] = useState(false)
  const [txOpen, setTxOpen] = useState(false)
  const router = useRouter()

  function handleAddTransaction() {
    setOpen(false)
    setTxOpen(true)
  }

  function handleImportMpesa() {
    setOpen(false)
    router.push('/dashboard/mpesa')
  }

  return (
    <>
      {/* Invisible backdrop to close menu on outside click */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-6 right-5 sm:right-6 z-50 flex flex-col items-end gap-3">
        {/* Action items — slide up when open */}
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ${
            open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {/* Import M-Pesa */}
          <div className="flex items-center gap-3">
            <span className="bg-popover border border-border rounded-lg px-3 py-1.5 text-sm font-medium shadow-md whitespace-nowrap">
              Import M-Pesa SMS
            </span>
            <button
              onClick={handleImportMpesa}
              aria-label="Import M-Pesa SMS"
              className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
            >
              <Smartphone className="h-5 w-5" />
            </button>
          </div>

          {/* Add transaction */}
          <div className="flex items-center gap-3">
            <span className="bg-popover border border-border rounded-lg px-3 py-1.5 text-sm font-medium shadow-md whitespace-nowrap">
              Add transaction
            </span>
            <button
              onClick={handleAddTransaction}
              aria-label="Add transaction"
              className="h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close quick actions' : 'Quick actions'}
          className={`h-14 w-14 rounded-full shadow-xl text-white flex items-center justify-center transition-all duration-200 active:scale-95 ${
            open
              ? 'bg-zinc-700 hover:bg-zinc-600'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {open
            ? <X className="h-6 w-6" />
            : <Plus className="h-6 w-6 transition-transform duration-200" />
          }
        </button>
      </div>

      <TransactionForm open={txOpen} onClose={() => setTxOpen(false)} />
    </>
  )
}
