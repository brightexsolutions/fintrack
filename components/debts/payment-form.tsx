'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { debtPaymentSchema, type DebtPaymentFormData } from '@/lib/validations/debt'
import { useLogDebtPayment } from '@/hooks/use-debts'
import { useCurrency } from '@/hooks/use-currency'
import type { Debt } from '@/types/database'

interface PaymentFormProps {
  open: boolean
  onClose: () => void
  debt: Debt | null
}

export function PaymentForm({ open, onClose, debt }: PaymentFormProps) {
  const { format } = useCurrency()
  const logPayment = useLogDebtPayment()

  const remaining = debt ? debt.amount - debt.amount_paid : 0

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DebtPaymentFormData>({
    resolver: zodResolver(debtPaymentSchema) as Resolver<DebtPaymentFormData>,
    defaultValues: { amount: undefined, note: '' },
  })

  async function onSubmit(values: DebtPaymentFormData) {
    if (!debt) return
    await logPayment.mutateAsync({ debtId: debt.id, values })
    reset()
    onClose()
  }

  function handleClose() {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Log payment</DialogTitle>
        </DialogHeader>
        {debt && (
          <div className="text-sm text-muted-foreground -mt-1 mb-1">
            <span className="font-medium text-foreground">{debt.contact_name}</span>
            {' · '}{format(remaining)} remaining
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Payment amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder={remaining ? String(remaining) : '0.00'}
              {...register('amount', {
                setValueAs: (value) => value === '' ? undefined : Number(value),
              })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="note" placeholder="e.g. Paid via M-Pesa" {...register('note')} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={logPayment.isPending}>
              {logPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
