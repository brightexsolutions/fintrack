import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(200),
  category_id: z.string().uuid().optional().or(z.literal('')),
  payment_method: z.string().min(1, 'Payment method is required'),
  transaction_date: z.string().min(1, 'Date is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['pending', 'completed', 'cancelled']).default('completed'),
})

export type TransactionFormData = z.infer<typeof transactionSchema>
