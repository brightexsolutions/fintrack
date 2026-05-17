'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Workspace, WorkspaceMember, WorkspaceInvitation, WorkspaceVisibleModules } from '@/types/database'
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
      const res = await fetch(`/api/workspace/${workspaceId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to invite member')
      }

      return data as {
        invitation: WorkspaceInvitation
        email_sent: boolean
        invite_url: string
      }
    },
    onSuccess: (data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['workspace_invitations', vars.workspaceId] })
      toast.success(data.email_sent ? 'Invitation sent by email' : 'Invitation created — copy the invite link to share it')
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

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; description?: string | null; visible_modules?: WorkspaceVisibleModules } }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Workspace
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// Returns the active workspace object (null = personal mode)
export function useActiveWorkspace(): Workspace | null {
  const { activeWorkspaceId } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()
  if (!activeWorkspaceId) return null
  return workspaces.find((w) => w.id === activeWorkspaceId) ?? null
}

// Returns the current user's role in the given workspace
export function useMyWorkspaceRole(workspaceId: string | null): WorkspaceMember['role'] | null {
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const [userId, setUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  if (!workspaceId || !userId) return null
  return members.find((m) => m.user_id === userId)?.role ?? null
}
