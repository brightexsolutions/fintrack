'use client'

import { useEffect, useState } from 'react'

interface FinTrackLoaderProps {
  onDone?: () => void
  minDurationMs?: number
}

export function FinTrackLoader({ onDone, minDurationMs = 1400 }: FinTrackLoaderProps) {
  const [phase, setPhase] = useState<'icon' | 'text' | 'tagline' | 'done'>('icon')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 300)
    const t2 = setTimeout(() => setPhase('tagline'), 750)
    const t3 = setTimeout(() => { setPhase('done'); onDone?.() }, minDurationMs)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone, minDurationMs])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{ opacity: phase === 'done' ? 0 : 1, transition: 'opacity 0.4s ease', pointerEvents: phase === 'done' ? 'none' : 'all' }}
    >
      {/* Pulsing ring */}
      <div className="relative flex items-center justify-center mb-6">
        <span
          className="absolute h-20 w-20 rounded-full bg-emerald-500/20 animate-ping"
          style={{ animationDuration: '1.4s' }}
        />
        <div
          className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg"
          style={{
            transform: phase === 'icon' ? 'scale(0.6)' : 'scale(1)',
            opacity: phase === 'icon' ? 0 : 1,
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          }}
        >
          <span className="text-white font-black text-3xl select-none">F</span>
        </div>
      </div>

      {/* Brand name letter-by-letter */}
      <div className="flex items-baseline gap-0.5 overflow-hidden h-10">
        {'FinTrack'.split('').map((char, i) => (
          <span
            key={i}
            className="text-3xl font-extrabold tracking-tight"
            style={{
              display: 'inline-block',
              transform: phase === 'icon' || phase === 'text' && i > 2 ? 'translateY(40px)' : 'translateY(0)',
              opacity: phase === 'icon' ? 0 : 1,
              transition: `transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 40}ms, opacity 0.3s ease ${i * 40}ms`,
              color: i < 3 ? 'hsl(var(--foreground))' : 'hsl(152, 72%, 42%)',
            }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Tagline */}
      <p
        className="text-sm text-muted-foreground mt-2"
        style={{
          opacity: phase === 'tagline' || phase === 'done' ? 1 : 0,
          transform: phase === 'tagline' || phase === 'done' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
        }}
      >
        Track every shilling. Together.
      </p>

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            style={{
              animation: 'bounce 1s ease-in-out infinite',
              animationDelay: `${i * 180}ms`,
              opacity: phase === 'icon' ? 0 : 1,
              transition: 'opacity 0.3s ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
