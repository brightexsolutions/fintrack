import { z } from 'zod'

export const workspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(200).optional().or(z.literal('')),
  currency: z.string().default('KES'),
})

export const inviteSchema = z.object({
  invitee_email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
})

export type WorkspaceFormData = z.infer<typeof workspaceSchema>
export type InviteFormData = z.infer<typeof inviteSchema>
