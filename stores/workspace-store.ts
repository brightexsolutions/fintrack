import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkspaceStore {
  activeWorkspaceId: string | null // null = personal (no workspace filter)
  setActiveWorkspace: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: 'fintrack-active-workspace' }
  )
)
