'use client'

import { Moon, Sun, Bell, Users, User } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileNav } from './mobile-nav'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/use-profile'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { data: profile } = useProfile()
  const { data: workspaces = [] } = useWorkspaces()
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore()
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-border/60 bg-card px-4 flex items-center justify-between sticky top-0 z-40">
      <MobileNav />

      {/* Workspace selector — visible on all screen sizes when workspaces exist */}
      {workspaces.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-7 px-2 text-xs gap-1.5 max-w-[140px] rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground items-center truncate ml-1 sm:ml-0">
            {activeWorkspaceId ? <Users className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
            <span className="truncate">{activeWs?.name ?? 'Personal'}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => setActiveWorkspace(null)} className={!activeWorkspaceId ? 'bg-muted' : ''}>
              <User className="h-3.5 w-3.5 mr-2" /> Personal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} onClick={() => setActiveWorkspace(ws.id)} className={activeWorkspaceId === ws.id ? 'bg-muted' : ''}>
                <Users className="h-3.5 w-3.5 mr-2" /> {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-8 w-8 rounded-full inline-flex items-center justify-center hover:ring-2 hover:ring-muted transition-all">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  {profile?.full_name ? getInitials(profile.full_name) : 'FT'}
                </AvatarFallback>
              </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
