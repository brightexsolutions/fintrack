import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive({ error: 'Amount must be greater than 0' }),
  description: z.string().min(1, { error: 'Description is required' }).max(200),
  category_id: z.union([z.string().uuid(), z.literal('')]).optional(),
  payment_method: z.string().min(1, { error: 'Payment method is required' }),
  transaction_date: z.string().min(1, { error: 'Date is required' }),
  notes: z.string().max(500).optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).default('completed'),
})

export type TransactionFormData = z.infer<typeof transactionSchema>
