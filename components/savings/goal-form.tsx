'use client'

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
import { savingsGoalSchema, type SavingsGoalFormData } from '@/lib/validations/savings'
import { useCreateSavingsGoal, useUpdateSavingsGoal } from '@/hooks/use-savings'
import type { SavingsGoal } from '@/types/database'

interface GoalFormProps {
  open: boolean
  onClose: () => void
  editing?: SavingsGoal | null
}

export function GoalForm({ open, onClose, editing }: GoalFormProps) {
  const create = useCreateSavingsGoal()
  const update = useUpdateSavingsGoal()
  const isPending = create.isPending || update.isPending
  const isEditing = !!editing

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SavingsGoalFormData>({
    resolver: zodResolver(savingsGoalSchema) as Resolver<SavingsGoalFormData>,
    defaultValues: editing ? {
      name: editing.name,
      description: editing.description ?? '',
      target_amount: editing.target_amount,
      target_date: editing.target_date ?? '',
    } : {
      name: '',
      description: '',
      target_amount: undefined,
      target_date: '',
    },
  })

  async function onSubmit(values: SavingsGoalFormData) {
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
          <DialogTitle>{isEditing ? 'Edit goal' : 'New savings goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal name</Label>
            <Input id="name" placeholder="e.g. Emergency Fund" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Target amount (KES)</Label>
            <Input id="target_amount" type="number" step="0.01" placeholder="0.00" {...register('target_amount')} />
            {errors.target_amount && <p className="text-sm text-destructive">{errors.target_amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Target date <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="target_date" type="date" {...register('target_date')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="description" placeholder="What are you saving for?" rows={2} {...register('description')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Create goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
