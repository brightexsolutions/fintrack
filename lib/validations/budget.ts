import { z } from 'zod'

export const budgetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category_id: z.string().uuid().optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  alerts_enabled: z.boolean().default(true),
  alert_threshold: z.coerce.number().min(0).max(100).default(80),
  description: z.string().max(200).optional().or(z.literal('')),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
})

export type BudgetFormData = z.infer<typeof budgetSchema>
