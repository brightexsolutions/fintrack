import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Keep-alive ping — called by Vercel cron every 3 days to prevent
// Supabase free tier from pausing the project after inactivity
export async function GET() {
  try {
    const supabase = await createClient()
    await supabase.from('profiles').select('id').limit(1)
    return NextResponse.json({ status: 'ok', ts: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
