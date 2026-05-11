'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { transactionSchema, type TransactionFormData } from '@/lib/validations/transaction'
import { useCreateTransaction, useUpdateTransaction, useCategories } from '@/hooks/use-transactions'
import type { Transaction } from '@/types/database'

const PAYMENT_METHODS = ['M-Pesa', 'Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Cheque', 'Other']
const EMPTY_CATEGORY_VALUE = '__no_category__'

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  editing?: Transaction | null
}

export function TransactionForm({ open, onClose, editing }: TransactionFormProps) {
  const { data: categories = [] } = useCategories()
  const create = useCreateTransaction()
  const update = useUpdateTransaction()

  const isEditing = !!editing
  const isPending = create.isPending || update.isPending

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema) as Resolver<TransactionFormData>,
    defaultValues: {
      type: 'expense',
      amount: undefined,
      description: '',
      category_id: '',
      payment_method: 'M-Pesa',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      status: 'completed',
    },
  })

  const txType = watch('type')
  const categoryId = watch('category_id')
  const paymentMethod = watch('payment_method')
  const filteredCategories = categories.filter((c) => c.type === txType || c.type === 'both')

  useEffect(() => {
    reset(editing ? {
      type: editing.type,
      amount: Number(editing.amount),
      description: editing.description,
      category_id: editing.category_id ?? '',
      payment_method: editing.payment_method,
      transaction_date: format(new Date(editing.transaction_date), 'yyyy-MM-dd'),
      notes: editing.notes ?? '',
      status: editing.status,
    } : {
      type: 'expense',
      amount: undefined,
      description: '',
      category_id: '',
      payment_method: 'M-Pesa',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      status: 'completed',
    })
  }, [editing, open, reset])

  async function onSubmit(values: TransactionFormData) {
    if (isEditing && editing) {
      await update.mutateAsync({ id: editing.id, values })
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
          <DialogTitle>{isEditing ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('type', t); setValue('category_id', '') }}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  txType === t
                    ? t === 'income'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="What was this for?" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId || EMPTY_CATEGORY_VALUE}
                onValueChange={(v) => setValue('category_id', v === EMPTY_CATEGORY_VALUE ? '' : (v ?? ''))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_CATEGORY_VALUE}>No category</SelectItem>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setValue('payment_method', v ?? 'M-Pesa')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_date">Date</Label>
            <Input id="transaction_date" type="date" {...register('transaction_date')} />
            {errors.transaction_date && <p className="text-sm text-destructive">{errors.transaction_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" placeholder="Any extra details..." rows={2} {...register('notes')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Add transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
