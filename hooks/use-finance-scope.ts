'use client'

import { useMemo } from 'react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useWorkspaces } from '@/hooks/use-workspace'

export function useFinanceScope() {
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  )

  return {
    activeWorkspaceId,
    activeWorkspace,
    isWorkspaceMode: Boolean(activeWorkspaceId),
    mode: activeWorkspaceId ? 'workspace' as const : 'personal' as const,
    scopeLabel: activeWorkspace?.name ?? 'Personal',
    switchToPersonal: () => setActiveWorkspace(null),
  }
}
