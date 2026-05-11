'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ParseResult, ParsedMpesaTransaction } from '@/lib/mpesa/parser'

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
  queryClient.invalidateQueries({ queryKey: ['dashboard_month_transactions'] })
}

export function useParseMpesaSms() {
  return useMutation({
    mutationFn: async (smsText: string): Promise<ParseResult> => {
      const res = await fetch('/api/mpesa/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms_text: smsText }),
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

export function useImportMpesaTransactions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transactions,
      rawText,
      categoryMap,
    }: {
      transactions: ParsedMpesaTransaction[]
      rawText: string
      categoryMap: Record<number, string>
    }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Record import
      const { data: importRecord, error: importErr } = await supabase
        .from('mpesa_imports')
        .insert({
          user_id: user.id,
          raw_sms_batch: rawText,
          total_sms_count: transactions.length,
          parsed_count: transactions.length,
          failed_count: 0,
          status: 'processing',
          parse_errors: [],
        })
        .select()
        .single()

      if (importErr) throw importErr

      // Check for duplicate mpesa_refs
      const refs = transactions.map((t) => t.mpesa_ref).filter(Boolean)
      const { data: existingRefs } = refs.length > 0
        ? await supabase
            .from('transactions')
            .select('mpesa_ref')
            .eq('user_id', user.id)
            .in('mpesa_ref', refs as string[])
        : { data: [] }

      const existingRefSet = new Set((existingRefs ?? []).map((r) => r.mpesa_ref))
      const batchRefSet = new Set<string>()
      const duplicates: number[] = []
      const toInsert = transactions.flatMap((t, i) => {
        if (t.mpesa_ref && (existingRefSet.has(t.mpesa_ref) || batchRefSet.has(t.mpesa_ref))) {
          duplicates.push(i)
          return []
        }
        if (t.mpesa_ref) batchRefSet.add(t.mpesa_ref)
        return [{ transaction: t, originalIndex: i }]
      })

      if (toInsert.length === 0) {
        await supabase.from('mpesa_imports').update({ status: 'completed', transactions_created: 0 }).eq('id', importRecord.id)
        return { created: 0, duplicates: duplicates.length }
      }

      const rows = toInsert.map(({ transaction, originalIndex }) => {
        const timestamp = normalizeTimestamp(transaction.timestamp)

        return {
        user_id: user.id,
        type: transaction.type as 'income' | 'expense',
        amount: transaction.amount,
        currency: 'KES',
        description: transaction.description,
        payment_method: 'M-Pesa',
        status: 'completed' as const,
        transaction_date: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        mpesa_ref: transaction.mpesa_ref,
        counterparty: transaction.counterparty,
        balance_after: transaction.balance_after,
        mpesa_import_id: importRecord.id,
        category_id: categoryMap[originalIndex] || null,
      }
      })

      const { error: insertErr } = await supabase.from('transactions').insert(rows)
      if (insertErr) {
        await supabase.from('mpesa_imports').update({ status: 'failed' }).eq('id', importRecord.id)
        throw insertErr
      }

      await supabase.from('mpesa_imports').update({
        status: 'completed',
        transactions_created: toInsert.length,
      }).eq('id', importRecord.id)

      return { created: toInsert.length, duplicates: duplicates.length }
    },
    onSuccess: (result) => {
      invalidateFinanceQueries(queryClient)
      const msg = result.duplicates > 0
        ? `Imported ${result.created} transactions (${result.duplicates} duplicates skipped)`
        : `Imported ${result.created} transactions`
      toast.success(msg)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
