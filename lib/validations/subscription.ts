import { z } from 'zod'

export const subscriptionSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).max(100),
  description: z.string().max(200).optional(),
  amount: z.coerce.number().positive({ error: 'Amount must be greater than 0' }),
  billing_cycle: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  next_billing_date: z.string().min(1, { error: 'Next billing date is required' }),
  category_id: z.union([z.string().uuid(), z.literal('')]).optional(),
  url: z.union([z.string().url({ error: 'Enter a valid URL' }), z.literal('')]).optional(),
  color: z.string().default('#6366F1'),
  reminder_days: z.coerce.number().min(0).max(30).default(3),
})

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>
