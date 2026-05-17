import { NextRequest, NextResponse } from 'next/server'
import { differenceInCalendarDays, format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCronAuth } from '@/lib/cron'
import { isMailConfigured, sendPaymentReminderEmail } from '@/lib/communications/mail'

export async function GET(request: NextRequest) {
  const authError = requireCronAuth(request)
  if (authError) return authError
  if (!isMailConfigured()) {
    return NextResponse.json({ error: 'Mail is not configured' }, { status: 503 })
  }

  const admin = createAdminClient()
  const today = new Date()
  const sentForDate = format(today, 'yyyy-MM-dd')

  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, notification_prefs')

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const { data: subscriptions, error: subscriptionError } = await admin
    .from('subscriptions')
    .select('id, user_id, name, amount, currency, next_billing_date, reminder_days, is_active')
    .eq('is_active', true)

  if (subscriptionError) {
    return NextResponse.json({ error: subscriptionError.message }, { status: 500 })
  }

  const { data: debts, error: debtError } = await admin
    .from('debts')
    .select('id, user_id, contact_name, amount, amount_paid, currency, due_date, type, status')
    .not('due_date', 'is', null)
    .in('status', ['active', 'partially_paid'])

  if (debtError) {
    return NextResponse.json({ error: debtError.message }, { status: 500 })
  }

  let sent = 0

  for (const profile of profiles ?? []) {
    if (!profile.notification_prefs?.payment_reminders || !profile.email) continue

    const { data: existingDigest } = await admin
      .from('communication_deliveries')
      .select('id')
      .eq('user_id', profile.id)
      .eq('channel', 'email')
      .eq('delivery_type', 'payment_reminder_digest')
      .eq('target_ref', 'personal')
      .eq('sent_for_date', sentForDate)
      .maybeSingle()

    if (existingDigest) continue

    const reminderItems = [
      ...(subscriptions ?? [])
        .filter((subscription) => subscription.user_id === profile.id)
        .filter((subscription) => {
          const dueIn = differenceInCalendarDays(new Date(subscription.next_billing_date), today)
          return dueIn >= 0 && dueIn <= subscription.reminder_days
        })
        .map((subscription) => ({
          title: `Subscription: ${subscription.name}`,
          dueLabel: format(new Date(subscription.next_billing_date), 'MMM d, yyyy'),
          amountLabel: `${subscription.currency} ${Number(subscription.amount).toFixed(2)}`,
        })),
      ...(debts ?? [])
        .filter((debt) => debt.user_id === profile.id && debt.due_date)
        .filter((debt) => {
          const dueIn = differenceInCalendarDays(new Date(debt.due_date!), today)
          return dueIn >= 0 && dueIn <= 3
        })
        .map((debt) => ({
          title: debt.type === 'i_owe' ? `Debt payment: ${debt.contact_name}` : `Collection follow-up: ${debt.contact_name}`,
          dueLabel: format(new Date(debt.due_date!), 'MMM d, yyyy'),
          amountLabel: `${debt.currency} ${Number(debt.amount - debt.amount_paid).toFixed(2)}`,
        })),
    ]

    if (reminderItems.length === 0) continue

    await sendPaymentReminderEmail({
      to: profile.email,
      fullName: profile.full_name,
      items: reminderItems,
    })

    await admin.from('communication_deliveries').insert({
      user_id: profile.id,
      channel: 'email',
      delivery_type: 'payment_reminder_digest',
      target_ref: 'personal',
      sent_for_date: sentForDate,
      metadata: { item_count: reminderItems.length },
    })

    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
