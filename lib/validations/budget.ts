import { z } from 'zod'

export const budgetSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).max(100),
  category_id: z.union([z.string().uuid(), z.literal('')]).optional(),
  amount: z.coerce.number().positive({ error: 'Amount must be greater than 0' }),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.string().min(1, { error: 'Start date is required' }),
  end_date: z.string().min(1, { error: 'End date is required' }),
  alerts_enabled: z.boolean().default(true),
  alert_threshold: z.coerce.number().min(0).max(100).default(80),
  description: z.string().max(200).optional(),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
})

export type BudgetFormData = z.infer<typeof budgetSchema>
