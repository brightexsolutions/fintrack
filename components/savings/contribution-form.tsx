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
import { contributionSchema, type ContributionFormData } from '@/lib/validations/savings'
import { useAddContribution } from '@/hooks/use-savings'
import { useCurrency } from '@/hooks/use-currency'
import type { SavingsGoal } from '@/types/database'

interface ContributionFormProps {
  open: boolean
  onClose: () => void
  goal: SavingsGoal | null
}

export function ContributionForm({ open, onClose, goal }: ContributionFormProps) {
  const { format } = useCurrency()
  const addContribution = useAddContribution()

  const remaining = goal ? goal.target_amount - goal.current_amount : 0

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema) as Resolver<ContributionFormData>,
    defaultValues: { amount: undefined, note: '' },
  })

  async function onSubmit(values: ContributionFormData) {
    if (!goal) return
    await addContribution.mutateAsync({ goalId: goal.id, values })
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
          <DialogTitle>Add contribution</DialogTitle>
        </DialogHeader>
        {goal && (
          <div className="text-sm text-muted-foreground -mt-1 mb-1">
            <span className="font-medium text-foreground">{goal.name}</span>
            {' · '}{format(remaining)} to go
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder={remaining > 0 ? String(remaining) : '0.00'}
              {...register('amount', {
                setValueAs: (value) => value === '' ? undefined : Number(value),
              })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="note" placeholder="e.g. Monthly savings" {...register('note')} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={addContribution.isPending}>
              {addContribution.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add contribution
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
