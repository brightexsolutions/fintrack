import { z } from 'zod'

export const debtSchema = z.object({
  type: z.enum(['owed_to_me', 'i_owe']),
  contact_name: z.string().min(1, 'Contact name is required').max(100),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(20).optional().or(z.literal('')),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  due_date: z.string().optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export const debtPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  note: z.string().max(200).optional().or(z.literal('')),
})

export type DebtFormData = z.infer<typeof debtSchema>
export type DebtPaymentFormData = z.infer<typeof debtPaymentSchema>
