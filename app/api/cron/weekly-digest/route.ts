import { NextRequest, NextResponse } from 'next/server'
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCronAuth } from '@/lib/cron'
import { isMailConfigured, sendWeeklyDigestEmail } from '@/lib/communications/mail'
import { formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const authError = requireCronAuth(request)
  if (authError) return authError
  if (!isMailConfigured()) {
    return NextResponse.json({ error: 'Mail is not configured' }, { status: 503 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const periodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const periodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const sentForDate = format(periodStart, 'yyyy-MM-dd')
  const periodLabel = `${format(periodStart, 'MMM d')} - ${format(periodEnd, 'MMM d, yyyy')}`

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, preferred_currency, notification_prefs')

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  let sent = 0

  for (const profile of profiles ?? []) {
    if (!profile.notification_prefs?.weekly_digest || !profile.email) continue

    const { data: existingDigest } = await admin
      .from('communication_deliveries')
      .select('id')
      .eq('user_id', profile.id)
      .eq('channel', 'email')
      .eq('delivery_type', 'weekly_digest')
      .eq('target_ref', 'personal')
      .eq('sent_for_date', sentForDate)
      .maybeSingle()

    if (existingDigest) continue

    const { data: transactions, error: transactionError } = await admin
      .from('transactions')
      .select('type, amount')
      .eq('user_id', profile.id)
      .is('workspace_id', null)
      .eq('status', 'completed')
      .gte('transaction_date', periodStart.toISOString())
      .lte('transaction_date', periodEnd.toISOString())

    if (transactionError) {
      return NextResponse.json({ error: transactionError.message }, { status: 500 })
    }

    const income = (transactions ?? [])
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
    const expenses = (transactions ?? [])
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0)
    const net = income - expenses

    await sendWeeklyDigestEmail({
      to: profile.email,
      fullName: profile.full_name,
      incomeLabel: formatCurrency(income, profile.preferred_currency),
      expenseLabel: formatCurrency(expenses, profile.preferred_currency),
      netLabel: formatCurrency(net, profile.preferred_currency),
      transactionCount: transactions?.length ?? 0,
      periodLabel,
    })

    await admin.from('communication_deliveries').insert({
      user_id: profile.id,
      channel: 'email',
      delivery_type: 'weekly_digest',
      target_ref: 'personal',
      sent_for_date: sentForDate,
      metadata: {
        income,
        expenses,
        net,
        transaction_count: transactions?.length ?? 0,
      },
    })

    sent++
  }

  return NextResponse.json({ ok: true, sent, period: periodLabel })
}
