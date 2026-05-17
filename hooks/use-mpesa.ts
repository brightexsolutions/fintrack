'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ParseResult, ParsedMpesaTransaction } from '@/lib/mpesa/parser'

export interface ImportMpesaDraft extends ParsedMpesaTransaction {
  category_id?: string | null
  transaction_date?: string | null
}

function normalizeTimestamp(timestamp: ParsedMpesaTransaction['timestamp'] | string | null | undefined): Date | null {
  if (!timestamp) return null
  if (timestamp instanceof Date) {
    return isNaN(timestamp.getTime()) ? null : timestamp
  }
  const parsed = new Date(timestamp as string)
  return isNaN(parsed.getTime()) ? null : parsed
}

function invalidateFinanceQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: ['insight_transactions'] })
  queryClient.invalidateQueries({ queryKey: ['monthly_trend'] })
  queryClient.invalidateQueries({ queryKey: ['budgets'] })
  queryClient.invalidateQueries({ queryKey: ['debts'] })
  queryClient.invalidateQueries({ queryKey: ['dashboard_month_transactions'] })
}

export function useParseMpesaSms() {
  return useMutation({
    mutationFn: async ({
      smsText,
      workspace_id,
    }: {
      smsText: string
      workspace_id?: string | null
    }): Promise<ParseResult> => {
      const res = await fetch('/api/mpesa/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms_text: smsText, workspace_id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Parse failed')
      }
      const result = await res.json() as ParseResult
      return {
        ...result,
        parsed: result.parsed.map((tx) => ({
          ...tx,
          timestamp: normalizeTimestamp(tx.timestamp),
        })),
      }
    },
  })
}

// ─── Fuliza debt helpers ─────────────────────────────────────

async function syncFulizaDebt(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  workspaceId: string | null,
  transactions: ImportMpesaDraft[]
) {
  // Collect fuliza credit transactions (those with outstanding balance)
  const fulizaCredits = transactions.filter(
    (t) => t.mpesa_type === 'fuliza' || (t.fuliza_outstanding != null && t.fuliza_outstanding > 0)
  )
  const fulizaRepayments = transactions.filter((t) => t.mpesa_type === 'fuliza_repayment')

  if (fulizaCredits.length === 0 && fulizaRepayments.length === 0) return

  const sourceTag = workspaceId ? `fuliza:ws:${workspaceId}` : `fuliza:personal:${userId}`

  // Find existing active Fuliza debt
  const { data: existingDebts } = await supabase
    .from('debts')
    .select('id, amount, amount_paid, status')
    .eq('user_id', userId)
    .eq('source_tag', sourceTag)
    .in('status', ['active', 'partially_paid'])
    .limit(1)

  const existingDebt = existingDebts?.[0] ?? null

  // For credits: use the highest outstanding amount seen in this batch
  if (fulizaCredits.length > 0) {
    const latestOutstanding = fulizaCredits.reduce((max, t) => {
      const v = t.fuliza_outstanding ?? t.amount
      return v > max ? v : max
    }, 0)

    if (latestOutstanding > 0) {
      if (existingDebt) {
        // Update outstanding to the new amount
        await supabase
          .from('debts')
          .update({ amount: latestOutstanding, updated_at: new Date().toISOString() })
          .eq('id', existingDebt.id)
      } else {
        await supabase.from('debts').insert({
          user_id: userId,
          workspace_id: workspaceId,
          type: 'i_owe',
          contact_name: 'Safaricom Fuliza',
          amount: latestOutstanding,
          currency: 'KES',
          description: 'Fuliza M-PESA overdraft balance',
          source_tag: sourceTag,
          due_date: fulizaCredits[0].fuliza_due_date ?? null,
        })
      }
    }
  }

  // For repayments: log a debt payment against the Fuliza debt
  if (fulizaRepayments.length > 0 && existingDebt) {
    const paymentRows = fulizaRepayments.map((t) => ({
      debt_id: existingDebt.id,
      user_id: userId,
      amount: t.amount,
      note: 'Auto-repayment from M-Pesa import',
      paid_at: t.timestamp ? t.timestamp.toISOString() : new Date().toISOString(),
    }))
    await supabase.from('debt_payments').insert(paymentRows)
  }
}

export function useImportMpesaTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transactions,
      rawText,
      skipped,
      workspace_id,
    }: {
      transactions: ImportMpesaDraft[]
      rawText: string
      skipped: Array<{ line: string; reason: string }>
      workspace_id?: string | null
    }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: importRecord, error: importErr } = await supabase
        .from('mpesa_imports')
        .insert({
          user_id: user.id,
          workspace_id: workspace_id ?? null,
          raw_sms_batch: rawText,
          total_sms_count: transactions.length + skipped.length,
          parsed_count: transactions.length,
          failed_count: skipped.length,
          skipped_count: skipped.length,
          duplicate_count: 0,
          status: 'processing',
          parse_errors: skipped,
          import_summary: {
            detected: transactions.length,
            skipped: skipped.length,
          },
        })
        .select()
        .single()

      if (importErr) throw importErr

      const refs = transactions.map((t) => t.mpesa_ref).filter((ref): ref is string => Boolean(ref))
      let existingRefs: Array<{ mpesa_ref: string | null }> = []

      if (refs.length > 0) {
        let duplicateQuery = supabase
          .from('transactions')
          .select('mpesa_ref')
          .in('mpesa_ref', refs)

        if (workspace_id) {
          duplicateQuery = duplicateQuery.eq('workspace_id', workspace_id)
        } else {
          duplicateQuery = duplicateQuery.eq('user_id', user.id).is('workspace_id', null)
        }

        const { data } = await duplicateQuery
        existingRefs = data ?? []
      }

      const existingRefSet = new Set(existingRefs.map((r) => r.mpesa_ref).filter((r): r is string => Boolean(r)))
      const batchRefSet = new Set<string>()
      const duplicates: number[] = []
      const toInsert = transactions.flatMap((t, index) => {
        if (t.mpesa_ref && (existingRefSet.has(t.mpesa_ref) || batchRefSet.has(t.mpesa_ref))) {
          duplicates.push(index)
          return []
        }
        if (t.mpesa_ref) batchRefSet.add(t.mpesa_ref)
        return [t]
      })

      if (toInsert.length === 0) {
        await supabase
          .from('mpesa_imports')
          .update({
            status: 'completed',
            transactions_created: 0,
            duplicate_count: duplicates.length,
            import_summary: { created: 0, duplicates: duplicates.length, skipped: skipped.length },
          })
          .eq('id', importRecord.id)
        return { created: 0, duplicates: duplicates.length }
      }

      const rows = toInsert.map((t) => {
        const timestamp = t.transaction_date
          ? new Date(`${t.transaction_date}T12:00:00`)
          : normalizeTimestamp(t.timestamp)

        return {
          user_id: user.id,
          workspace_id: workspace_id ?? null,
          type: t.type as 'income' | 'expense',
          amount: t.amount,
          currency: 'KES',
          description: t.description,
          payment_method: 'M-Pesa',
          status: 'completed' as const,
          transaction_date: timestamp ? timestamp.toISOString() : new Date().toISOString(),
          mpesa_ref: t.mpesa_ref,
          counterparty: t.counterparty,
          balance_after: t.balance_after,
          mpesa_import_id: importRecord.id,
          category_id: t.category_id || null,
          mpesa_type: t.mpesa_type ?? null,
          fuliza_outstanding: t.fuliza_outstanding ?? null,
          is_transfer: t.is_transfer ?? false,
        }
      })

      const { error: insertErr } = await supabase.from('transactions').insert(rows)
      if (insertErr) {
        await supabase.from('mpesa_imports').update({ status: 'failed' }).eq('id', importRecord.id)
        throw insertErr
      }

      // Auto-create / update Fuliza debt records in the background (non-blocking for UI)
      syncFulizaDebt(supabase, user.id, workspace_id ?? null, toInsert).catch(() => {})

      await supabase
        .from('mpesa_imports')
        .update({
          status: 'completed',
          transactions_created: toInsert.length,
          duplicate_count: duplicates.length,
          import_summary: {
            created: toInsert.length,
            duplicates: duplicates.length,
            skipped: skipped.length,
          },
        })
        .eq('id', importRecord.id)

      return { created: toInsert.length, duplicates: duplicates.length }
    },
    onSuccess: (result) => {
      invalidateFinanceQueries(queryClient)
      const msg = result.duplicates > 0
        ? `Imported ${result.created} transactions (${result.duplicates} duplicates skipped)`
        : `Imported ${result.created} transactions`
      toast.success(msg)
      if (result.created > 0) {
        fetch('/api/push/budget-alert', { method: 'POST' }).catch(() => {})
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
