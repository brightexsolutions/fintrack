'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, AlertCircle, CheckCircle2, SkipForward, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useParseMpesaSms, useImportMpesaTransactions } from '@/hooks/use-mpesa'
import { useCategories } from '@/hooks/use-transactions'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import type { ParsedMpesaTransaction } from '@/lib/mpesa/parser'

export default function MpesaPage() {
  const { format } = useCurrency()
  const router = useRouter()
  const [smsText, setSmsText] = useState('')
  const [parsed, setParsed] = useState<ParsedMpesaTransaction[] | null>(null)
  const [skipped, setSkipped] = useState<Array<{ line: string; reason: string }>>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [imported, setImported] = useState<{ created: number; duplicates: number } | null>(null)

  const parseMutation = useParseMpesaSms()
  const importMutation = useImportMpesaTransactions()
  const { data: categories = [] } = useCategories()

  async function handleParse() {
    if (!smsText.trim()) return
    setParsed(null)
    setSkipped([])
    setCategoryMap({})
    setImported(null)
    const result = await parseMutation.mutateAsync(smsText)
    setParsed(result.parsed)
    setSkipped(result.skipped)
  }

  async function handleImport() {
    if (!parsed) return
    const result = await importMutation.mutateAsync({
      transactions: parsed,
      rawText: smsText,
      categoryMap,
    })
    setImported(result)
    setParsed(null)
    setSmsText('')
  }

  function handleReset() {
    setSmsText('')
    setParsed(null)
    setSkipped([])
    setCategoryMap({})
    setImported(null)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">MPesa Import</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Paste your MPesa SMS messages below to auto-import transactions.
        </p>
      </div>

      {/* Success state */}
      {imported && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-emerald-700 dark:text-emerald-300">Import complete</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
              {imported.created} transaction{imported.created !== 1 ? 's' : ''} imported
              {imported.duplicates > 0 ? `, ${imported.duplicates} duplicate${imported.duplicates !== 1 ? 's' : ''} skipped` : ''}
            </p>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleReset}>
                Import more
              </Button>
              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => router.push('/dashboard')}>
                <LayoutDashboard className="h-3 w-3" /> View Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input step */}
      {!imported && !parsed && (
        <div className="space-y-3">
          <Textarea
            placeholder={`Paste MPesa SMS messages here, separated by blank lines.\n\nExample:\nABC123XY Confirmed.\nYou have sent Ksh1,000.00 to John Doe 0712345678 on 15/3/24 at 2:45 PM.\nNew M-PESA balance is Ksh4,500.00. Transaction cost, Ksh10.00.`}
            className="min-h-[200px] font-mono text-xs resize-y"
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
          />
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleParse}
            disabled={!smsText.trim() || parseMutation.isPending}
          >
            {parseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Parse SMS messages
          </Button>
        </div>
      )}

      {/* Preview step */}
      {parsed && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {parsed.length} detected
              </Badge>
              {skipped.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400">
                  <SkipForward className="h-3 w-3 mr-1" />
                  {skipped.length} skipped
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleReset}>
              Start over
            </Button>
          </div>

          {/* Preview — card list on mobile, table on sm+ */}
          <div className="rounded-xl border border-border overflow-hidden">

            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border">
              {parsed.map((tx, i) => {
                const txCategories = categories.filter((c) =>
                  tx.type === 'income' ? c.type === 'income' || c.type === 'both' : c.type === 'expense' || c.type === 'both'
                )
                return (
                  <div key={i} className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            {tx.type}
                          </span>
                          {tx.timestamp && (
                            <span className="text-[10px] text-muted-foreground">{formatDate(tx.timestamp)}</span>
                          )}
                        </div>
                        <p className="text-xs font-medium truncate">{tx.description}</p>
                        {tx.mpesa_ref && (
                          <p className="text-[10px] text-muted-foreground font-mono">{tx.mpesa_ref}</p>
                        )}
                      </div>
                      <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}>{format(tx.amount)}</p>
                    </div>
                    <select
                      className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring dark:bg-input/30"
                      value={categoryMap[i] ?? ''}
                      onChange={(e) => setCategoryMap((prev) => ({ ...prev, [i]: e.target.value }))}
                    >
                      <option value="">No category</option>
                      {txCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Description</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Amount</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {parsed.map((tx, i) => {
                    const txCategories = categories.filter((c) =>
                      tx.type === 'income' ? c.type === 'income' || c.type === 'both' : c.type === 'expense' || c.type === 'both'
                    )
                    return (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs max-w-[200px] truncate">{tx.description}</p>
                          {tx.mpesa_ref && (
                            <p className="text-[10px] text-muted-foreground font-mono">{tx.mpesa_ref}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-medium">
                          {format(tx.amount)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {tx.timestamp ? formatDate(tx.timestamp) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="h-7 w-40 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                            value={categoryMap[i] ?? ''}
                            onChange={(e) => setCategoryMap((prev) => ({ ...prev, [i]: e.target.value }))}
                          >
                            <option value="">No category</option>
                            {txCategories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skipped */}
          {skipped.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors">
                <AlertCircle className="h-3.5 w-3.5" />
                {skipped.length} unrecognized message{skipped.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-border">
                {skipped.map((s, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-muted-foreground font-mono truncate">{s.line.slice(0, 80)}{s.line.length > 80 ? '…' : ''}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleImport}
              disabled={parsed.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {parsed.length} transaction{parsed.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
