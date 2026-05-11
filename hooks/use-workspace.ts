'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Workspace, WorkspaceMember, WorkspaceInvitation } from '@/types/database'
import type { WorkspaceFormData, InviteFormData } from '@/lib/validations/workspace'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, workspace:workspaces(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) throw error
      return (data ?? []).map((m) => m.workspace) as Workspace[]
    },
    staleTime: 60 * 1000,
  })
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace_members', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return []
      // Use API route with service role so all members can see each other's profiles
      const res = await fetch(`/api/workspace/${workspaceId}/members`)
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = await res.json()
      return (data ?? []) as (WorkspaceMember & { profile: { id: string; full_name: string; email: string; avatar_url: string | null } })[]
    },
    staleTime: 60 * 1000,
  })
}

export function useWorkspaceInvitations(workspaceId: string | null) {
  return useQuery({
    queryKey: ['workspace_invitations', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as WorkspaceInvitation[]
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: WorkspaceFormData) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert({ owner_id: user.id, name: values.name, description: values.description || null, currency: values.currency })
        .select()
        .single()

      if (wsErr) throw wsErr

      // Add owner as member
      const { error: memErr } = await supabase.from('workspace_members').insert({
        workspace_id: ws.id,
        user_id: user.id,
        role: 'owner',
      })
      if (memErr) throw memErr

      return ws as Workspace
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      toast.success('Workspace created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('workspaces').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      toast.success('Workspace deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ workspaceId, values }: { workspaceId: string; values: InviteFormData }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          inviter_id: user.id,
          invitee_email: values.invitee_email,
          role: values.role,
        })
        .select()
        .single()

      if (error) throw error
      return data as WorkspaceInvitation
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_invitations', vars.workspaceId] })
      toast.success('Invitation sent')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_members', vars.workspaceId] })
      toast.success('Member removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ invitationId, workspaceId }: { invitationId: string; workspaceId: string }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'declined' })
        .eq('id', invitationId)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_invitations', vars.workspaceId] })
      toast.success('Invitation cancelled')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
