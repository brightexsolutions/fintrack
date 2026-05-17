'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  PenLine,
  RefreshCw,
  Smartphone,
  Upload,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useImportMpesaTransactions, useParseMpesaSms, type ImportMpesaDraft } from '@/hooks/use-mpesa'
import { useCategories, useCreateTransaction } from '@/hooks/use-transactions'
import { useCategorizationRules } from '@/hooks/use-categorization'
import { autoCategorize } from '@/lib/mpesa/auto-categorize'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import { useFinanceScope } from '@/hooks/use-finance-scope'
import { toast } from 'sonner'

function toDateInput(value: Date | null) {
  if (!value) return new Date().toISOString().slice(0, 10)
  const offset = value.getTimezoneOffset() * 60_000
  return new Date(value.getTime() - offset).toISOString().slice(0, 10)
}

interface ManualDraft {
  amount: string
  type: 'expense' | 'income'
  description: string
  transaction_date: string
  category_id: string
}

const EMPTY_MANUAL: ManualDraft = {
  amount: '',
  type: 'expense',
  description: '',
  transaction_date: new Date().toISOString().slice(0, 10),
  category_id: '',
}

export default function MpesaPage() {
  const { format } = useCurrency()
  const router = useRouter()
  const { data: categories = [] } = useCategories()
  const { data: userRules = [] } = useCategorizationRules()
  const { activeWorkspaceId, isWorkspaceMode, scopeLabel } = useFinanceScope()

  const [smsText, setSmsText] = useState('')
  const [drafts, setDrafts] = useState<ImportMpesaDraft[]>([])
  const [skipped, setSkipped] = useState<Array<{ line: string; reason: string }>>([])
  const [duplicateRefs, setDuplicateRefs] = useState<string[]>([])
  const [imported, setImported] = useState<{ created: number; duplicates: number; skipped: number } | null>(null)
  const [skippedOpen, setSkippedOpen] = useState(false)
  // Manual parse: index of the skipped row that has the form open
  const [manualIdx, setManualIdx] = useState<number | null>(null)
  const [manualForm, setManualForm] = useState<ManualDraft>(EMPTY_MANUAL)
  const [savedManual, setSavedManual] = useState<Set<number>>(new Set())

  const parseMutation = useParseMpesaSms()
  const importMutation = useImportMpesaTransactions()
  const createTxMutation = useCreateTransaction()

  const existingDuplicateSet = useMemo(() => new Set(duplicateRefs), [duplicateRefs])
  const reviewableCount = drafts.filter((draft) => !(draft.mpesa_ref && existingDuplicateSet.has(draft.mpesa_ref))).length

  async function handleParse() {
    if (!smsText.trim()) return

    setImported(null)
    setSavedManual(new Set())
    setManualIdx(null)
    const result = await parseMutation.mutateAsync({
      smsText,
      workspace_id: activeWorkspaceId,
    })

    setDrafts(
      result.parsed.map((transaction) => ({
        ...transaction,
        category_id: autoCategorize(transaction, categories, userRules),
        transaction_date: toDateInput(transaction.timestamp),
      }))
    )
    setSkipped(result.skipped)
    setDuplicateRefs(result.duplicate_refs ?? [])
  }

  async function handleImport() {
    if (drafts.length === 0) return

    const result = await importMutation.mutateAsync({
      transactions: drafts,
      rawText: smsText,
      skipped,
      workspace_id: activeWorkspaceId,
    })

    setImported({
      created: result.created,
      duplicates: result.duplicates,
      skipped: skipped.length,
    })
    setDrafts([])
    setSkipped([])
    setDuplicateRefs([])
    setSmsText('')
  }

  function handleReset() {
    setSmsText('')
    setDrafts([])
    setSkipped([])
    setDuplicateRefs([])
    setImported(null)
    setSavedManual(new Set())
    setManualIdx(null)
  }

  function updateDraft(index: number, patch: Partial<ImportMpesaDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, ...patch } : draft
    )))
  }

  function openManual(index: number) {
    setManualIdx(index)
    setManualForm(EMPTY_MANUAL)
  }

  async function saveManual(skippedIndex: number) {
    const amount = parseFloat(manualForm.amount)
    if (!amount || !manualForm.description.trim()) return
    await createTxMutation.mutateAsync({
      type: manualForm.type,
      amount,
      description: manualForm.description.trim(),
      transaction_date: manualForm.transaction_date,
      category_id: manualForm.category_id || undefined,
      payment_method: 'mpesa',
      status: 'completed',
      workspace_id: activeWorkspaceId ?? undefined,
    } as Parameters<typeof createTxMutation.mutateAsync>[0])
    toast.success('Transaction saved manually')
    setSavedManual((prev) => { const next = new Set(prev); next.add(skippedIndex); return next })
    setManualIdx(null)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold">M-Pesa Import</h1>
          <Badge variant="secondary" className="gap-1">
            {isWorkspaceMode ? <Users className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
            {scopeLabel}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste your M-Pesa messages, review what was detected, then import only the clean transactions into your current scope.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            step: '1',
            title: 'Paste messages',
            text: 'Copy SMS text from your phone and paste it here. Rough pasted blocks are okay.',
          },
          {
            step: '2',
            title: 'Review results',
            text: 'We detect transactions, flag existing duplicates, and explain any skipped messages.',
          },
          {
            step: '3',
            title: 'Confirm import',
            text: 'Adjust category, description, or date before saving into your current scope.',
          },
        ].map((item) => (
          <div key={item.step} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {item.step}
            </div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>

      {imported && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-2">
              <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-300">Import complete</p>
                <p className="text-sm text-emerald-700/90 dark:text-emerald-300/90">
                  {imported.created} transaction{imported.created !== 1 ? 's' : ''} imported into {scopeLabel}.
                  {imported.duplicates > 0 ? ` ${imported.duplicates} duplicate${imported.duplicates !== 1 ? 's were' : ' was'} skipped.` : ''}
                  {imported.skipped > 0 ? ` ${imported.skipped} unsupported message${imported.skipped !== 1 ? 's were' : ' was'} left out.` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Import more
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/dashboard/transactions')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  View transactions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!drafts.length && !imported && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="mpesa-paste">Paste M-Pesa messages</Label>
            <Textarea
              id="mpesa-paste"
              value={smsText}
              onChange={(event) => setSmsText(event.target.value)}
              className="min-h-[220px] resize-y font-mono text-xs"
              placeholder={`Paste messages separated by blank lines or as one copied block.\n\nExample:\nQJD1X2YZ Confirmed.\nYou have sent Ksh1,000.00 to John Doe 0712345678 on 15/3/24 at 2:45 PM.\nNew M-PESA balance is Ksh4,500.00. Transaction cost, Ksh10.00.`}
            />
            <p className="text-xs text-muted-foreground">
              Tip: you can paste mixed messages. We will only import the ones we can confidently understand.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleParse}
              disabled={!smsText.trim() || parseMutation.isPending}
            >
              {parseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Parse messages
            </Button>
            <div className="text-xs text-muted-foreground">
              Import target: <span className="font-medium text-foreground">{scopeLabel}</span>
            </div>
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Detected</p>
              <p className="mt-1 text-lg font-bold">{drafts.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Ready to import</p>
              <p className="mt-1 text-lg font-bold">{reviewableCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Existing duplicates</p>
              <p className="mt-1 text-lg font-bold">{duplicateRefs.length}</p>
            </div>
            {skipped.length > 0 ? (
              <button
                onClick={() => setSkippedOpen((o) => !o)}
                className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-left hover:bg-amber-500/10 transition-colors"
              >
                <p className="text-xs text-amber-700 dark:text-amber-400">Skipped messages</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{skipped.length}</p>
                  <ChevronDown className={`h-4 w-4 text-amber-600 transition-transform ${skippedOpen ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                  {skippedOpen ? 'Click to hide' : 'Click to see reasons'}
                </p>
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Skipped messages</p>
                <p className="mt-1 text-lg font-bold">0</p>
              </div>
            )}
          </div>

          {/* Skipped messages panel with manual-save escape hatch */}
          {skippedOpen && skipped.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {skipped.length} message{skipped.length !== 1 ? 's' : ''} were skipped
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70 ml-auto">
                  You can save any of these manually
                </p>
              </div>
              <div className="divide-y divide-amber-500/10">
                {skipped.map((item, index) => (
                  <div key={`${item.line}-${index}`} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{item.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground font-mono break-all leading-relaxed">
                          {item.line.length > 200 ? `${item.line.slice(0, 200)}…` : item.line}
                        </p>
                      </div>
                      {savedManual.has(index) ? (
                        <span className="text-xs text-emerald-600 font-medium shrink-0 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-7 text-xs gap-1"
                          onClick={() => manualIdx === index ? setManualIdx(null) : openManual(index)}
                        >
                          <PenLine className="h-3 w-3" />
                          {manualIdx === index ? 'Cancel' : 'Save manually'}
                        </Button>
                      )}
                    </div>

                    {/* Inline manual entry form */}
                    {manualIdx === index && (
                      <div className="rounded-lg border border-amber-500/30 bg-background p-3 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground">Enter transaction details manually</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Amount (Ksh)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={manualForm.amount}
                              onChange={(e) => setManualForm((f) => ({ ...f, amount: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Type</Label>
                            <select
                              className="h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 text-sm outline-none focus:border-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                              value={manualForm.type}
                              onChange={(e) => setManualForm((f) => ({ ...f, type: e.target.value as 'expense' | 'income' }))}
                            >
                              <option value="expense">Expense</option>
                              <option value="income">Income</option>
                            </select>
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Input
                              placeholder="What was this for?"
                              value={manualForm.description}
                              onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Date</Label>
                            <Input
                              type="date"
                              value={manualForm.transaction_date}
                              onChange={(e) => setManualForm((f) => ({ ...f, transaction_date: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Category (optional)</Label>
                            <select
                              className="h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 text-sm outline-none focus:border-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                              value={manualForm.category_id}
                              onChange={(e) => setManualForm((f) => ({ ...f, category_id: e.target.value }))}
                            >
                              <option value="">No category</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                          disabled={!manualForm.amount || !manualForm.description.trim() || createTxMutation.isPending}
                          onClick={() => saveManual(index)}
                        >
                          {createTxMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Save transaction
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">Review transactions before import</h2>
                <p className="text-xs text-muted-foreground">You can adjust the description, date, and category for each detected item.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Start over
              </Button>
            </div>

            <div className="space-y-3 p-4">
              {drafts.map((draft, index) => {
                const isExistingDuplicate = Boolean(draft.mpesa_ref && existingDuplicateSet.has(draft.mpesa_ref))
                const availableCategories = categories.filter((category) => (
                  draft.type === 'income'
                    ? category.type === 'income' || category.type === 'both'
                    : category.type === 'expense' || category.type === 'both'
                ))
                const isPaybill = draft.mpesa_type === 'paybill'

                return (
                  <div
                    key={`${draft.mpesa_ref ?? 'draft'}-${index}`}
                    className={`rounded-xl border p-4 ${isExistingDuplicate ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-background'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={draft.type === 'income' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}>
                            {draft.type}
                          </Badge>
                          {draft.is_transfer && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">Transfer</Badge>
                          )}
                          {draft.mpesa_ref && <Badge variant="outline" className="font-mono text-[11px]">{draft.mpesa_ref}</Badge>}
                          {isExistingDuplicate && <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Already imported</Badge>}
                        </div>
                        <p className="text-sm font-semibold">{format(draft.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {draft.timestamp ? formatDate(draft.timestamp) : 'No timestamp found in message'}
                        </p>
                      </div>
                      <div className="max-w-md text-xs text-muted-foreground">
                        {draft.raw}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={draft.description}
                          onChange={(event) => updateDraft(index, { description: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={draft.transaction_date ?? ''}
                          onChange={(event) => updateDraft(index, { transaction_date: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Category</Label>
                        <select
                          className="h-9 w-full rounded-lg border border-input bg-background text-foreground px-3 text-sm outline-none focus:border-ring dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                          value={draft.category_id ?? ''}
                          onChange={(event) => updateDraft(index, { category_id: event.target.value || null })}
                        >
                          <option value="">No category</option>
                          {availableCategories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>
                          {draft.type === 'income'
                            ? 'Received from'
                            : draft.mpesa_type === 'buy_goods'
                              ? 'Merchant'
                              : draft.mpesa_type === 'paybill'
                                ? 'Biller'
                                : 'Sent to'}
                        </Label>
                        <Input value={draft.counterparty ?? '—'} disabled />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{isPaybill ? 'Paybill account' : 'Balance after'}</Label>
                        <Input
                          value={
                            isPaybill
                              ? (draft.counterparty_number ?? '—')
                              : (draft.balance_after != null ? format(draft.balance_after) : '—')
                          }
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {duplicateRefs.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Existing duplicates will be skipped</p>
                  <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
                    We found {duplicateRefs.length} M-Pesa reference{duplicateRefs.length !== 1 ? 's' : ''} already stored in this scope.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleImport}
              disabled={drafts.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
              Import {drafts.length} detected transaction{drafts.length !== 1 ? 's' : ''}
            </Button>
            <Button
              variant="ghost"
              onClick={handleParse}
              disabled={parseMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Parse again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
