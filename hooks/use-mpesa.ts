'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ParseResult, ParsedMpesaTransaction } from '@/lib/mpesa/parser'

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
      return res.json()
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
      const duplicates: number[] = []
      const toInsert = transactions.filter((t, i) => {
        if (t.mpesa_ref && existingRefSet.has(t.mpesa_ref)) {
          duplicates.push(i)
          return false
        }
        return true
      })

      if (toInsert.length === 0) {
        await supabase.from('mpesa_imports').update({ status: 'completed', transactions_created: 0 }).eq('id', importRecord.id)
        return { created: 0, duplicates: duplicates.length }
      }

      const rows = toInsert.map((t, i) => ({
        user_id: user.id,
        type: t.type as 'income' | 'expense',
        amount: t.amount,
        currency: 'KES',
        description: t.description,
        payment_method: 'M-Pesa',
        status: 'completed' as const,
        transaction_date: t.timestamp ? t.timestamp.toISOString() : new Date().toISOString(),
        mpesa_ref: t.mpesa_ref,
        counterparty: t.counterparty,
        balance_after: t.balance_after,
        mpesa_import_id: importRecord.id,
        category_id: categoryMap[i] || null,
      }))

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
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      const msg = result.duplicates > 0
        ? `Imported ${result.created} transactions (${result.duplicates} duplicates skipped)`
        : `Imported ${result.created} transactions`
      toast.success(msg)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
