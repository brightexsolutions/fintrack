import { z } from 'zod'

export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(200).optional().or(z.literal('')),
  target_amount: z.coerce.number().positive('Target must be greater than 0'),
  target_date: z.string().optional().or(z.literal('')),
})

export const contributionSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  note: z.string().max(200).optional().or(z.literal('')),
})

export type SavingsGoalFormData = z.infer<typeof savingsGoalSchema>
export type ContributionFormData = z.infer<typeof contributionSchema>
