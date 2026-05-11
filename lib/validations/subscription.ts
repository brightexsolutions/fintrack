import { z } from 'zod'

export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(200).optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  next_billing_date: z.string().min(1, 'Next billing date is required'),
  category_id: z.string().uuid().optional().or(z.literal('')),
  url: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  color: z.string().default('#6366F1'),
  reminder_days: z.coerce.number().min(0).max(30).default(3),
})

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>
