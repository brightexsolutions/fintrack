import { z } from 'zod'

export const workspaceSchema = z.object({
  name: z.string().min(1, { error: 'Name is required' }).max(100),
  description: z.string().max(200).optional(),
  currency: z.string(),
})

export const inviteSchema = z.object({
  invitee_email: z.string().email({ error: 'Valid email is required' }),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export type WorkspaceFormData = z.infer<typeof workspaceSchema>
export type InviteFormData = z.infer<typeof inviteSchema>
