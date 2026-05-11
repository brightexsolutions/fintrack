'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, CreditCard,
  Target, BarChart3, Smartphone, Users, Settings, LogOut, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/transactions',label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/budgets',     label: 'Budgets',      icon: PiggyBank },
  { href: '/dashboard/debts',       label: 'Debts',        icon: CreditCard },
  { href: '/dashboard/savings',     label: 'Savings',      icon: Target },
  { href: '/dashboard/subscriptions',label: 'Subscriptions',icon: RefreshCw },
  { href: '/dashboard/insights',    label: 'Insights',     icon: BarChart3 },
  { href: '/dashboard/mpesa',       label: 'M-Pesa Import',icon: Smartphone },
  { href: '/dashboard/workspace',   label: 'Workspace',    icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    navItems.forEach(({ href }) => router.prefetch(href))
    router.prefetch('/dashboard/settings')
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r border-border/60 bg-card px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">F</span>
        </div>
        <span className="font-bold text-base">FinTrack</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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

      {/* Bottom */}
      <div className="space-y-0.5 pt-4 border-t border-border/60">
        <Link
          href="/dashboard/settings"
          prefetch
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname.startsWith('/dashboard/settings')
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
