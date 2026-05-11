import Link from 'next/link'
import { ArrowRight, BarChart3, Shield, Smartphone, Users, Wallet, TrendingUp, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const features = [
  {
    icon: Smartphone,
    title: 'M-Pesa Auto-Import',
    description: 'Paste your M-Pesa SMS messages and watch transactions auto-populate — amounts, categories, and counterparties extracted instantly.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: BarChart3,
    title: 'Smart Budgets',
    description: 'Set monthly, weekly, or yearly spending limits per category. Get warnings before you overspend.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: Wallet,
    title: 'Debt Tracker',
    description: 'Track who owes you money and what you owe others. Log partial payments and see progress at a glance.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Savings Goals',
    description: 'Set targets for big purchases, emergencies, or dreams. Track contributions and celebrate milestones.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Users,
    title: 'Family Workspaces',
    description: 'Invite a partner or family members to a shared space. Everyone tracks together, data stays private otherwise.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: RefreshCw,
    title: 'Subscription Tracker',
    description: 'Never forget a renewal. Track Netflix, Spotify, DSTV and all your recurring bills in one place.',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Shield,
    title: 'Private by Default',
    description: 'Your data is visible only to you. Row-level security ensures no one else can access your finances.',
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/40 sticky top-0 z-50 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">F</span>
            </div>
            <span className="font-bold text-lg">FinTrack</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800">
          M-Pesa auto-import · Free to use
        </Badge>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Track every shilling.
          <br />
          <span className="text-emerald-500">Together.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          A personal finance tracker built for Kenya. Import M-Pesa transactions automatically, set budgets,
          track debts, and share finances with family — all in one clean, private space.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2 w-full sm:w-auto">
              Start for free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Dashboard preview skeleton */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {['Total Balance', 'Monthly Income', 'Monthly Expenses', 'Savings Rate'].map((label) => (
              <div key={label} className="bg-background rounded-xl p-3 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">{label}</p>
                <div className="h-5 bg-muted rounded w-20 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-36 bg-background rounded-xl border border-border/50 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Income vs Expenses · 12-month view</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Everything you need to stay on top</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 p-5 bg-card hover:border-border transition-colors">
              <div className={`w-10 h-10 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to take control?</h2>
          <p className="text-muted-foreground mb-8">Free forever for personal and family use. No credit card needed.</p>
          <Link href="/register">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              Create your account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-[10px]">F</span>
            </div>
            <span>© {new Date().getFullYear()} FinTrack</span>
          </div>
          <p>
            Built by{' '}
            <a
              href="https://www.brightexsolutions.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-600 hover:underline"
            >
              Brightex Solutions
            </a>
            {' '}· Free for personal &amp; family use
          </p>
        </div>
      </footer>
    </div>
  )
}
