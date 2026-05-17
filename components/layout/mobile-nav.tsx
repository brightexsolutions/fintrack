'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LayoutDashboard, ArrowLeftRight, PiggyBank, CreditCard, Target, BarChart3, Smartphone, Users, Settings, LogOut, RefreshCw } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useActiveWorkspace } from '@/hooks/use-workspace'
import { DEFAULT_VISIBLE_MODULES } from '@/types/database'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  moduleKey?: keyof typeof DEFAULT_VISIBLE_MODULES
  personalOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight,  moduleKey: 'transactions' },
  { href: '/dashboard/budgets',      label: 'Budgets',      icon: PiggyBank,        moduleKey: 'budgets', personalOnly: true },
  { href: '/dashboard/debts',        label: 'Debts',        icon: CreditCard,       moduleKey: 'debts', personalOnly: true },
  { href: '/dashboard/savings',      label: 'Savings',      icon: Target,           moduleKey: 'savings', personalOnly: true },
  { href: '/dashboard/subscriptions', label: 'Subscriptions',icon: RefreshCw,       personalOnly: true },
  { href: '/dashboard/insights',     label: 'Insights',     icon: BarChart3 },
  { href: '/dashboard/mpesa',        label: 'M-Pesa Import',icon: Smartphone },
  { href: '/dashboard/workspace',    label: 'Workspace',    icon: Users },
  { href: '/dashboard/settings',     label: 'Settings',     icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const activeWorkspace = useActiveWorkspace()
  const visibleModules = activeWorkspace?.visible_modules ?? DEFAULT_VISIBLE_MODULES

  const visibleNavItems = navItems.filter(({ moduleKey, personalOnly }) => {
    if (activeWorkspace && personalOnly) return false
    if (!moduleKey || !activeWorkspace) return true
    return visibleModules[moduleKey] !== false
  })

  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href))
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    setOpen(false)
    router.push('/login')
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 h-14 border-b border-border/60">
            <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="font-bold text-base">FinTrack</span>
          </div>
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {visibleNavItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </nav>
          <div className="px-3 pb-4 pt-2 border-t border-border/60">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
