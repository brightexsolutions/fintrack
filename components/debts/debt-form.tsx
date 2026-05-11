'use client'

import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { debtSchema, type DebtFormData } from '@/lib/validations/debt'
import { useCreateDebt, useUpdateDebt } from '@/hooks/use-debts'
import type { Debt } from '@/types/database'

interface DebtFormProps {
  open: boolean
  onClose: () => void
  defaultType?: 'owed_to_me' | 'i_owe'
  editing?: Debt | null
}

export function DebtForm({ open, onClose, defaultType = 'i_owe', editing }: DebtFormProps) {
  const create = useCreateDebt()
  const update = useUpdateDebt()
  const isPending = create.isPending || update.isPending
  const isEditing = !!editing

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<DebtFormData>({
    resolver: zodResolver(debtSchema) as Resolver<DebtFormData>,
    defaultValues: {
      type: defaultType,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      amount: undefined,
      description: '',
      due_date: '',
      notes: '',
    },
  })

  useEffect(() => {
    reset(editing ? {
      type: editing.type,
      contact_name: editing.contact_name,
      contact_email: editing.contact_email ?? '',
      contact_phone: editing.contact_phone ?? '',
      amount: Number(editing.amount),
      description: editing.description,
      due_date: editing.due_date ?? '',
      notes: editing.notes ?? '',
    } : {
      type: defaultType,
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      amount: undefined,
      description: '',
      due_date: '',
      notes: '',
    })
  }, [defaultType, editing, open, reset])

  const debtType = watch('type')

  async function onSubmit(values: DebtFormData) {
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
          <DialogTitle>{isEditing ? 'Edit debt' : 'Record debt'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['i_owe', 'owed_to_me'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue('type', t)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  debtType === t
                    ? t === 'i_owe'
                      ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {t === 'i_owe' ? 'I Owe' : 'Owed to Me'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact name</Label>
            <Input id="contact_name" placeholder="Who is involved?" {...register('contact_name')} />
            {errors.contact_name && <p className="text-sm text-destructive">{errors.contact_name.message}</p>}
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
            <Input id="description" placeholder="What is this for?" {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="contact_phone" placeholder="+254..." {...register('contact_phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="due_date" type="date" {...register('due_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="notes" placeholder="Any extra details..." rows={2} {...register('notes')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Record debt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
