import { z } from 'zod'

export const debtSchema = z.object({
  type: z.enum(['owed_to_me', 'i_owe']),
  contact_name: z.string().min(1, { error: 'Contact name is required' }).max(100),
  contact_email: z.union([z.string().email({ error: 'Enter a valid email' }), z.literal('')]).optional(),
  contact_phone: z.string().max(20).optional(),
  amount: z.coerce.number().positive({ error: 'Amount must be greater than 0' }),
  description: z.string().min(1, { error: 'Description is required' }),
  due_date: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export const debtPaymentSchema = z.object({
  amount: z.coerce.number().positive({ error: 'Amount must be greater than 0' }),
  note: z.string().max(200).optional(),
})

export type DebtFormData = z.infer<typeof debtSchema>
export type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>
