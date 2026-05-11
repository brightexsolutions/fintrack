'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Mail, Trash2, Crown, ShieldCheck, Edit2, Eye, Link2, Settings2, ArrowLeftRight, PiggyBank, CreditCard, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useWorkspaces, useCreateWorkspace, useDeleteWorkspace, useUpdateWorkspace,
  useWorkspaceMembers, useWorkspaceInvitations, useInviteMember, useRemoveMember, useCancelInvitation,
} from '@/hooks/use-workspace'
import { workspaceSchema, inviteSchema, type WorkspaceFormData, type InviteFormData } from '@/lib/validations/workspace'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Workspace, WorkspaceVisibleModules } from '@/types/database'
import { DEFAULT_VISIBLE_MODULES } from '@/types/database'

const ROLE_CONFIG = {
  owner:  { label: 'Owner',  icon: Crown,       className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  admin:  { label: 'Admin',  icon: ShieldCheck, className: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400' },
  editor: { label: 'Editor', icon: Edit2,        className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
  viewer: { label: 'Viewer', icon: Eye,          className: 'bg-muted text-muted-foreground' },
}

const MODULE_OPTIONS: { key: keyof WorkspaceVisibleModules; label: string; icon: React.ElementType }[] = [
  { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { key: 'budgets',      label: 'Budgets',      icon: PiggyBank },
  { key: 'debts',        label: 'Debts',        icon: CreditCard },
  { key: 'savings',      label: 'Savings',      icon: Target },
]

export default function WorkspacePage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [])

  const { data: workspaces = [], isLoading } = useWorkspaces()
  const createWs = useCreateWorkspace()
  const deleteWs = useDeleteWorkspace()
  const updateWs = useUpdateWorkspace()

  const { data: members = [] } = useWorkspaceMembers(selectedWs?.id ?? null)
  const { data: invitations = [] } = useWorkspaceInvitations(selectedWs?.id ?? null)
  const removeMember = useRemoveMember()
  const cancelInvitation = useCancelInvitation()
  const inviteMember = useInviteMember()

  // Current user's role in the selected workspace
  const myRole = currentUserId ? (members.find((m) => m.user_id === currentUserId)?.role ?? null) : null
  const isOwner = myRole === 'owner'
  const canInvite = myRole === 'owner' || myRole === 'admin'

  const { register: regWs, handleSubmit: handleWsSubmit, reset: resetWs, formState: { errors: wsErrors } } = useForm<WorkspaceFormData>({
    resolver: zodResolver(workspaceSchema) as Resolver<WorkspaceFormData>,
    defaultValues: { name: '', description: '', currency: 'KES' },
  })

  const { register: regInv, handleSubmit: handleInvSubmit, reset: resetInv, setValue: setInvVal, formState: { errors: invErrors } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema) as Resolver<InviteFormData>,
    defaultValues: { invitee_email: '', role: 'editor' },
  })

  async function onCreateWs(values: WorkspaceFormData) {
    await createWs.mutateAsync(values)
    resetWs()
    setCreateOpen(false)
  }

  async function onInvite(values: InviteFormData) {
    if (!selectedWs) return
    await inviteMember.mutateAsync({ workspaceId: selectedWs.id, values })
    resetInv()
    setInviteOpen(false)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Share finances with family or partners</p>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New workspace
        </Button>
      </div>

      {isLoading && <Skeleton className="h-24 w-full rounded-xl" />}

      {!isLoading && workspaces.length === 0 && (
        <div className="py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No shared workspaces yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create one to share finances with others.</p>
        </div>
      )}

      {/* Workspace list */}
      {workspaces.map((ws) => (
        <div key={ws.id} className="rounded-xl border border-border bg-card">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl"
            onClick={() => setSelectedWs(selectedWs?.id === ws.id ? null : ws)}
          >
            <div>
              <p className="font-medium">{ws.name}</p>
              {ws.description && <p className="text-xs text-muted-foreground mt-0.5">{ws.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{ws.currency}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(ws) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Expanded panel */}
          {selectedWs?.id === ws.id && (
            <div className="border-t border-border p-4 space-y-4">
              {/* Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Members</p>
                  {canInvite && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setInviteOpen(true)}
                    >
                      <Mail className="h-3 w-3" /> Invite
                    </Button>
                  )}
                </div>
                {members.map((m) => {
                  const rc = ROLE_CONFIG[m.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.viewer
                  const RoleIcon = rc.icon
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium shrink-0">
                        {getInitials(m.profile?.full_name || m.profile?.email || '?')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.profile?.full_name || m.profile?.email}</p>
                        {m.profile?.full_name && <p className="text-xs text-muted-foreground">{m.profile.email}</p>}
                      </div>
                      <Badge variant="secondary" className={`text-[10px] h-5 gap-1 ${rc.className}`}>
                        <RoleIcon className="h-2.5 w-2.5" />{rc.label}
                      </Badge>
                      {m.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMember.mutate({ workspaceId: ws.id, userId: m.user_id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pending invitations */}
              {invitations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Pending invitations</p>
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{inv.invitee_email}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{inv.role}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const link = `${window.location.origin}/invite/${inv.token}`
                            navigator.clipboard.writeText(link)
                          }}
                        >
                          <Link2 className="h-3 w-3" /> Copy link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => cancelInvitation.mutate({ invitationId: inv.id, workspaceId: ws.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Visibility controls — owner only */}
              {isOwner && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">Shared modules</p>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">Choose what members can access in this workspace.</p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {MODULE_OPTIONS.map(({ key, label, icon: ModIcon }) => {
                      const currentModules = ws.visible_modules ?? DEFAULT_VISIBLE_MODULES
                      const enabled = currentModules[key] !== false
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            const updated = { ...currentModules, [key]: !enabled }
                            updateWs.mutate({ id: ws.id, updates: { visible_modules: updated } })
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                            enabled
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'border-border bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          <ModIcon className="h-3.5 w-3.5 shrink-0" />
                          {label}
                          <span className={`ml-auto text-[10px] ${enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                            {enabled ? 'On' : 'Off'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Create workspace dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { resetWs(); setCreateOpen(false) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New workspace</DialogTitle></DialogHeader>
          <form onSubmit={handleWsSubmit(onCreateWs)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name</Label>
              <Input id="ws-name" placeholder="e.g. Brown Family" {...regWs('name')} />
              {wsErrors.name && <p className="text-sm text-destructive">{wsErrors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="ws-desc" placeholder="What is this workspace for?" {...regWs('description')} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { resetWs(); setCreateOpen(false) }}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={createWs.isPending}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite member dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) { resetInv(); setInviteOpen(false) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Invite member</DialogTitle></DialogHeader>
          <form onSubmit={handleInvSubmit(onInvite)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-email">Email address</Label>
              <Input id="inv-email" type="email" placeholder="name@example.com" {...regInv('invitee_email')} />
              {invErrors.invitee_email && <p className="text-sm text-destructive">{invErrors.invitee_email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="editor" onValueChange={(v) => v && setInvVal('role', v as InviteFormData['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isOwner && <SelectItem value="admin">Admin — invite & manage</SelectItem>}
                  <SelectItem value="editor">Editor — add & edit</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { resetInv(); setInviteOpen(false) }}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={inviteMember.isPending}>
                Send invite
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete workspace?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            &ldquo;{deleteTarget?.name}&rdquo; and all shared data will be permanently deleted.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={async () => { if (deleteTarget) { await deleteWs.mutateAsync(deleteTarget.id); setDeleteTarget(null); setSelectedWs(null) } }} disabled={deleteWs.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
