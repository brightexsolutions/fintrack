import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendPushToUser } from '@/lib/push'
import { isMailConfigured, sendBudgetAlertEmail } from '@/lib/communications/mail'

// Called client-side after a transaction is created.
// Checks if any budget has crossed its alert threshold and fires a push notification + email.
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

  const [{ data: budgets }, { data: profile }] = await Promise.all([
    supabase.from('budget_progress').select('*').eq('user_id', user.id).eq('status', 'active'),
    supabase.from('profiles').select('full_name, notification_prefs').eq('id', user.id).single(),
  ])

  if (!budgets?.length) return NextResponse.json({ ok: true, alerted: 0 })

  const emailEnabled = (profile?.notification_prefs as Record<string, boolean> | null)?.budget_alerts !== false
  const mailReady = isMailConfigured() && emailEnabled && !!user.email

  let alerted = 0
  for (const b of budgets) {
    const pct = Number(b.percentage)
    const threshold = Number(b.alert_threshold)
    const exceeded = b.is_exceeded

    if (!b.alerts_enabled) continue
    if (!exceeded && pct < threshold) continue

    const title = exceeded ? `Budget exceeded: ${b.name}` : `Budget warning: ${b.name}`
    const body = exceeded
      ? `You've spent ${pct.toFixed(0)}% of your ${b.name} budget. Ksh ${Number(b.spent).toFixed(0)} of Ksh ${Number(b.budget_amount).toFixed(0)}.`
      : `${pct.toFixed(0)}% of your ${b.name} budget used. Ksh ${Number(b.remaining).toFixed(0)} remaining.`

    await sendPushToUser(user.id, title, body, '/dashboard/budgets')

    if (mailReady) {
      await sendBudgetAlertEmail({
        to: user.email!,
        fullName: profile?.full_name ?? '',
        budgetName: b.name,
        percentUsed: pct,
        spent: Number(b.spent),
        budgetAmount: Number(b.budget_amount),
        remaining: Number(b.remaining),
        exceeded,
      }).catch(() => {})
    }

    alerted++
  }

  return NextResponse.json({ ok: true, alerted })
}
