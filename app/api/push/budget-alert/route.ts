import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendPushToUser } from '@/lib/push'

// Called client-side after a transaction is created.
// Checks if any budget has crossed its alert threshold and fires a push notification.
export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  // Fetch budgets with their current progress view
  const { data: budgets } = await supabase
    .from('budget_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (!budgets?.length) return NextResponse.json({ ok: true, alerted: 0 })

  let alerted = 0
  for (const b of budgets) {
    const pct = Number(b.percentage)
    const threshold = Number(b.alert_threshold)
    const exceeded = b.is_exceeded

    if (!b.alerts_enabled) continue

    if (exceeded) {
      await sendPushToUser(
        user.id,
        `Budget exceeded: ${b.name}`,
        `You've spent ${pct.toFixed(0)}% of your ${b.name} budget. Ksh ${Number(b.spent).toFixed(0)} of Ksh ${Number(b.budget_amount).toFixed(0)}.`,
        '/dashboard/budgets'
      )
      alerted++
    } else if (pct >= threshold) {
      await sendPushToUser(
        user.id,
        `Budget warning: ${b.name}`,
        `${pct.toFixed(0)}% of your ${b.name} budget used. Ksh ${Number(b.remaining).toFixed(0)} remaining.`,
        '/dashboard/budgets'
      )
      alerted++
    }
  }

  return NextResponse.json({ ok: true, alerted })
}
