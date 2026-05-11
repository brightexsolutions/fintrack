'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, RefreshCw, ExternalLink, Trash2, Pencil, CheckCircle, AlertTriangle, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useSubscriptions, useCreateSubscription, useUpdateSubscription,
  useDeleteSubscription, useMarkPaid, isDueSoon,
} from '@/hooks/use-subscriptions'
import { useCategories } from '@/hooks/use-transactions'
import { subscriptionSchema, type SubscriptionFormData } from '@/lib/validations/subscription'
import { formatDate } from '@/lib/utils'
import { useCurrency } from '@/hooks/use-currency'
import { parseISO, differenceInDays } from 'date-fns'
import type { Subscription } from '@/types/database'

const EMPTY_CATEGORY_VALUE = '__no_category__'

const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

const PRESET_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
  '#06B6D4', '#8B5CF6', '#F97316', '#84CC16', '#6B7280',
]

function SubCard({
  sub,
  onEdit,
  onDelete,
  onMarkPaid,
}: {
  sub: Subscription
  onEdit: (s: Subscription) => void
  onDelete: (s: Subscription) => void
  onMarkPaid: (s: Subscription) => void
}) {
  const { format } = useCurrency()
  const dueIn = differenceInDays(parseISO(sub.next_billing_date), new Date())
  const dueSoon = isDueSoon(sub.next_billing_date, sub.reminder_days)
  const overdue = dueIn < 0

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 transition-all ${!sub.is_active ? 'opacity-50' : ''} ${dueSoon && !overdue ? 'border-amber-500/40' : overdue ? 'border-red-500/40' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-lg shrink-0 flex items-center justify-center text-white text-sm font-bold" style={{ background: sub.color }}>
            {sub.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-medium text-sm truncate">{sub.name}</p>
              {sub.url && (
                <a href={sub.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{CYCLE_LABELS[sub.billing_cycle]}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {dueSoon && !overdue && (
            <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Bell className="h-2.5 w-2.5 mr-0.5" /> Due soon
            </Badge>
          )}
          {overdue && (
            <Badge variant="secondary" className="text-[10px] h-5 bg-red-500/10 text-red-600 border-red-500/20">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Overdue
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" onClick={() => onEdit(sub)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDelete(sub)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-lg font-bold tabular-nums">{format(sub.amount)}</p>
        <div className="text-right">
          <p className={`text-xs font-medium ${overdue ? 'text-red-500' : dueSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {overdue ? `${Math.abs(dueIn)}d overdue` : dueIn === 0 ? 'Due today' : `In ${dueIn}d`}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatDate(sub.next_billing_date)}</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs gap-1.5 text-emerald-600 border-emerald-600/30 hover:bg-emerald-500/10"
        onClick={() => onMarkPaid(sub)}
      >
        <CheckCircle className="h-3.5 w-3.5" /> Mark as paid
      </Button>
    </div>
  )
}

export default function SubscriptionsPage() {
  const { format } = useCurrency()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null)

  const { data: subscriptions = [], isLoading } = useSubscriptions()
  const { data: categories = [] } = useCategories()
  const createSub = useCreateSubscription()
  const updateSub = useUpdateSubscription()
  const deleteSub = useDeleteSubscription()
  const markPaid = useMarkPaid()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema) as Resolver<SubscriptionFormData>,
    defaultValues: {
      name: '',
      description: '',
      amount: undefined,
      billing_cycle: 'monthly',
      next_billing_date: '',
      category_id: '',
      url: '',
      color: '#6366F1',
      reminder_days: 3,
    },
  })

  const selectedColor = watch('color')
  const billingCycle = watch('billing_cycle')
  const categoryId = watch('category_id')

  useEffect(() => {
    if (!formOpen) return
    reset(editing ? {
      name: editing.name,
      description: editing.description ?? '',
      amount: Number(editing.amount),
      billing_cycle: editing.billing_cycle,
      next_billing_date: editing.next_billing_date,
      category_id: editing.category_id ?? '',
      url: editing.url ?? '',
      color: editing.color,
      reminder_days: Number(editing.reminder_days),
    } : {
      name: '',
      description: '',
      amount: undefined,
      billing_cycle: 'monthly',
      next_billing_date: '',
      category_id: '',
      url: '',
      color: '#6366F1',
      reminder_days: 3,
    })
  }, [editing, formOpen, reset])

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(sub: Subscription) {
    setEditing(sub)
    setFormOpen(true)
  }

  async function onSubmit(values: SubscriptionFormData) {
    if (editing) {
      await updateSub.mutateAsync({ id: editing.id, values })
    } else {
      await createSub.mutateAsync(values)
    }
    setFormOpen(false)
    reset()
  }

  const active = subscriptions.filter((s) => s.is_active)
  const inactive = subscriptions.filter((s) => !s.is_active)

  const monthlyTotal = useMemo(() => {
    return active.reduce((sum, s) => {
      const factor = { weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }[s.billing_cycle] ?? 1
      return sum + s.amount * factor
    }, 0)
  }, [active])

  const yearlyTotal = monthlyTotal * 12
  const dueSoonCount = active.filter((s) => isDueSoon(s.next_billing_date, s.reminder_days)).length

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your recurring bills and renewals</p>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Add subscription
        </Button>
      </div>

      {/* Summary strip */}
      {!isLoading && active.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Monthly cost</p>
            <p className="text-base font-bold tabular-nums mt-0.5">{format(monthlyTotal)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Yearly cost</p>
            <p className="text-base font-bold tabular-nums mt-0.5">{format(yearlyTotal)}</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${dueSoonCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
            <p className="text-xs text-muted-foreground">Due soon</p>
            <p className={`text-base font-bold mt-0.5 ${dueSoonCount > 0 ? 'text-amber-600' : ''}`}>{dueSoonCount}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      )}

      {!isLoading && subscriptions.length === 0 && (
        <div className="py-16 text-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Add Netflix, Spotify, or any recurring bill.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {active.map((sub) => (
            <SubCard
              key={sub.id}
              sub={sub}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onMarkPaid={(s) => markPaid.mutate({ id: s.id, currentDate: s.next_billing_date, cycle: s.billing_cycle })}
            />
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Inactive</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {inactive.map((sub) => (
              <SubCard key={sub.id} sub={sub} onEdit={openEdit} onDelete={setDeleteTarget} onMarkPaid={() => {}} />
            ))}
          </div>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); reset() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit subscription' : 'Add subscription'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Netflix, Spotify…" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Amount (Ksh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <Select value={billingCycle} onValueChange={(v) => v && setValue('billing_cycle', v as SubscriptionFormData['billing_cycle'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Next billing date</Label>
                <Input type="date" {...register('next_billing_date')} />
                {errors.next_billing_date && <p className="text-xs text-destructive">{errors.next_billing_date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Remind me (days before)</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  {...register('reminder_days', {
                    setValueAs: (value) => value === '' ? undefined : Number(value),
                  })}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Category</Label>
                <Select value={categoryId || EMPTY_CATEGORY_VALUE} onValueChange={(v) => setValue('category_id', v === EMPTY_CATEGORY_VALUE ? '' : (v ?? ''))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_CATEGORY_VALUE}>No category</SelectItem>
                    {categories.filter((c) => c.type === 'expense' || c.type === 'both').map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Website URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input type="url" placeholder="https://netflix.com" {...register('url')} />
                {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ background: c, borderColor: selectedColor === c ? c : 'transparent', outline: selectedColor === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                      onClick={() => setValue('color', c)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setFormOpen(false); reset() }}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createSub.isPending || updateSub.isPending}>
                {editing ? 'Save' : 'Add'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove subscription?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">&ldquo;{deleteTarget?.name}&rdquo; will be removed from your tracker.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleteSub.isPending}
              onClick={async () => { if (deleteTarget) { await deleteSub.mutateAsync(deleteTarget.id); setDeleteTarget(null) } }}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
