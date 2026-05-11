'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { budgetSchema, type BudgetFormData } from '@/lib/validations/budget'
import { useCreateBudget, useUpdateBudget } from '@/hooks/use-budgets'
import { useCategories } from '@/hooks/use-transactions'
import type { BudgetProgress } from '@/types/database'

const EMPTY_CATEGORY_VALUE = '__all_categories__'

interface BudgetFormProps {
  open: boolean
  onClose: () => void
  editing?: BudgetProgress | null
}

function defaultDates() {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function BudgetForm({ open, onClose, editing }: BudgetFormProps) {
  const { data: categories = [] } = useCategories()
  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both')
  const create = useCreateBudget()
  const update = useUpdateBudget()
  const isPending = create.isPending || update.isPending
  const isEditing = !!editing

  const dates = defaultDates()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema) as Resolver<BudgetFormData>,
    defaultValues: {
      name: '',
      category_id: '',
      amount: undefined,
      period: 'monthly',
      start_date: dates.start,
      end_date: dates.end,
      alerts_enabled: true,
      alert_threshold: 80,
    },
  })

  const alertsEnabled = watch('alerts_enabled')
  const period = watch('period')
  const categoryId = watch('category_id')

  useEffect(() => {
    reset(editing ? {
      name: editing.name,
      category_id: editing.category_id ?? '',
      amount: Number(editing.budget_amount),
      period: editing.period,
      start_date: editing.start_date,
      end_date: editing.end_date,
      alerts_enabled: editing.alerts_enabled,
      alert_threshold: Number(editing.alert_threshold),
      description: '',
    } : {
      name: '',
      category_id: '',
      amount: undefined,
      period: 'monthly',
      start_date: dates.start,
      end_date: dates.end,
      alerts_enabled: true,
      alert_threshold: 80,
      description: '',
    })
  }, [dates.end, dates.start, editing, open, reset])

  useEffect(() => {
    if (isEditing) return
    const now = new Date()
    if (period === 'monthly') {
      setValue('start_date', format(startOfMonth(now), 'yyyy-MM-dd'))
      setValue('end_date', format(endOfMonth(now), 'yyyy-MM-dd'))
    } else if (period === 'yearly') {
      setValue('start_date', format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'))
      setValue('end_date', format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd'))
    } else if (period === 'weekly') {
      const day = now.getDay()
      const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7))
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      setValue('start_date', format(mon, 'yyyy-MM-dd'))
      setValue('end_date', format(sun, 'yyyy-MM-dd'))
    }
  }, [period, isEditing, setValue])

  async function onSubmit(values: BudgetFormData) {
    if (isEditing && editing) {
      await update.mutateAsync({ id: editing.budget_id, values })
    } else {
      await create.mutateAsync(values)
    }
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit budget' : 'Create budget'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Budget name</Label>
            <Input id="name" placeholder="e.g. Monthly Groceries" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId || EMPTY_CATEGORY_VALUE}
                onValueChange={(v) => setValue('category_id', v === EMPTY_CATEGORY_VALUE ? '' : (v ?? ''))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_CATEGORY_VALUE}>Any category</SelectItem>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period</Label>
              <Select
                value={period}
                onValueChange={(v) => v && setValue('period', v as BudgetFormData['period'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Budget amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', {
                setValueAs: (value) => value === '' ? undefined : Number(value),
              })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date</Label>
              <Input id="start_date" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End date</Label>
              <Input id="end_date" type="date" {...register('end_date')} />
              {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Budget alerts</p>
              <p className="text-xs text-muted-foreground">Warn when spending exceeds threshold</p>
            </div>
            <Switch
              checked={alertsEnabled}
              onCheckedChange={(v: boolean) => setValue('alerts_enabled', v)}
            />
          </div>

          {alertsEnabled && (
            <div className="space-y-2">
              <Label htmlFor="alert_threshold">Alert threshold (%)</Label>
              <Input
                id="alert_threshold"
                type="number"
                min="1"
                max="100"
                placeholder="80"
                {...register('alert_threshold', {
                  setValueAs: (value) => value === '' ? undefined : Number(value),
                })}
              />
              <p className="text-xs text-muted-foreground">Alert when {watch('alert_threshold') || 80}% of budget is used</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Create budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
