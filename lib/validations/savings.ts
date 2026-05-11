import { z } from 'zod'

export const savingsGoalSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).max(100),
  description: z.string().max(200).optional(),
  target_amount: z.coerce.number().positive({ error: 'Target must be greater than 0' }),
  target_date: z.string().optional(),
})

export const contributionSchema = z.object({
  amount: z.coerce.number().positive({ error: 'Amount must be greater than 0' }),
  note: z.string().max(200).optional(),
})

export type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>
export type ContributionFormData = z.infer<typeof contributionSchema>
