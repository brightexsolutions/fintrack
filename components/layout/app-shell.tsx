'use client'

import { useState } from 'react'
import { FinTrackLoader } from '@/components/ui/fintrack-loader'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  return (
    <>
      {!ready && <FinTrackLoader onDone={() => setReady(true)} />}
      <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        {children}
      </div>
    </>
  )
}
