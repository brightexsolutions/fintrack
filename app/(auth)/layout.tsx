import Link from 'next/link'

/* Decorative floating finance icons rendered as SVG stickers */
function FinanceStickers() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Coin top-left */}
      <svg className="absolute top-8 left-8 opacity-10 dark:opacity-[0.07] animate-[spin_18s_linear_infinite]" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#10B981" strokeWidth="3" />
        <circle cx="32" cy="32" r="22" fill="none" stroke="#10B981" strokeWidth="1.5" />
        <text x="32" y="38" textAnchor="middle" fill="#10B981" fontSize="18" fontWeight="bold">Ksh</text>
      </svg>

      {/* Chart bars top-right */}
      <svg className="absolute top-12 right-12 opacity-10 dark:opacity-[0.07]" width="72" height="56" viewBox="0 0 72 56">
        <rect x="4"  y="32" width="12" height="20" rx="3" fill="#6366F1" />
        <rect x="20" y="18" width="12" height="34" rx="3" fill="#6366F1" />
        <rect x="36" y="8"  width="12" height="44" rx="3" fill="#10B981" />
        <rect x="52" y="24" width="12" height="28" rx="3" fill="#6366F1" />
      </svg>

      {/* Piggy bank bottom-left */}
      <svg className="absolute bottom-16 left-10 opacity-10 dark:opacity-[0.07]" width="68" height="68" viewBox="0 0 68 68">
        <ellipse cx="34" cy="40" rx="24" ry="20" fill="none" stroke="#F59E0B" strokeWidth="2.5" />
        <circle cx="48" cy="34" r="4" fill="#F59E0B" />
        <path d="M10 40 Q4 36 4 30 Q4 24 10 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="22" y1="58" x2="22" y2="64" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <line x1="34" y1="60" x2="34" y2="66" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <line x1="46" y1="58" x2="46" y2="64" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d="M28 22 Q34 14 40 22" fill="none" stroke="#F59E0B" strokeWidth="2" />
        <rect x="30" y="16" width="8" height="4" rx="1" fill="#F59E0B" />
      </svg>

      {/* Trending up arrow bottom-right */}
      <svg className="absolute bottom-20 right-10 opacity-10 dark:opacity-[0.07]" width="72" height="56" viewBox="0 0 72 56">
        <polyline points="4,48 24,28 40,36 68,8" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="52,8 68,8 68,24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Wallet mid-left */}
      <svg className="absolute top-1/2 left-6 -translate-y-1/2 opacity-[0.07] dark:opacity-[0.05]" width="56" height="44" viewBox="0 0 56 44">
        <rect x="2" y="8" width="52" height="34" rx="6" fill="none" stroke="#8B5CF6" strokeWidth="2.5" />
        <path d="M2 16 L54 16" stroke="#8B5CF6" strokeWidth="2" />
        <rect x="36" y="22" width="16" height="14" rx="4" fill="none" stroke="#8B5CF6" strokeWidth="2" />
        <circle cx="44" cy="29" r="2.5" fill="#8B5CF6" />
        <path d="M10 8 L10 4 Q10 2 12 2 L36 2 Q38 2 38 4 L38 8" fill="none" stroke="#8B5CF6" strokeWidth="2" />
      </svg>

      {/* Dollar/KES mid-right */}
      <svg className="absolute top-1/2 right-6 translate-y-8 opacity-[0.07] dark:opacity-[0.05]" width="48" height="80" viewBox="0 0 48 80">
        <text x="24" y="52" textAnchor="middle" fill="#EC4899" fontSize="52" fontWeight="900" opacity="0.9">₭</text>
      </svg>

      {/* Small coins scattered */}
      <svg className="absolute top-1/3 left-1/4 opacity-[0.06] dark:opacity-[0.04]" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="none" stroke="#10B981" strokeWidth="2" />
        <text x="16" y="21" textAnchor="middle" fill="#10B981" fontSize="12" fontWeight="bold">$</text>
      </svg>
      <svg className="absolute top-2/3 right-1/4 opacity-[0.06] dark:opacity-[0.04]" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="none" stroke="#F59E0B" strokeWidth="2" />
        <text x="14" y="19" textAnchor="middle" fill="#F59E0B" fontSize="10" fontWeight="bold">€</text>
      </svg>
    </div>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 flex flex-col items-center justify-center p-4 relative">
      <FinanceStickers />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <span className="text-white font-black text-base">F</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight">FinTrack</span>
          </div>
          <p className="text-sm text-muted-foreground">Track every shilling. Together.</p>
        </div>

        {children}

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            By signing in you agree to our{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="#" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</Link>
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            Built by{' '}
            <a
              href="https://www.brightexsolutions.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
            >
              Brightex Solutions
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
