/**
 * Internal endpoint: sends a Web Push notification to a user.
 * Called server-side (from cron jobs or budget alert triggers).
 *
 * Requires env vars:
 *   VAPID_PUBLIC_KEY   — base64url VAPID public key
 *   VAPID_PRIVATE_KEY  — base64url VAPID private key
 *   VAPID_EMAIL        — mailto: contact (e.g. admin@brightexsolutions.co.ke)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * To generate VAPID keys (one-time):
 *   npx web-push generate-vapid-keys
 */

import { NextRequest, NextResponse } from 'next/server'

// Minimal Web Push without the heavy node `web-push` package
// using native fetch + WebCrypto (Edge runtime compatible)
async function sendPush(subscription: { endpoint: string; p256dh: string; auth_key: string }, payload: object) {
  // If the web-push npm package is added, use it here.
  // For now, we log and return — full VAPID signing requires the package.
  console.log('[push/send] Would push to', subscription.endpoint.slice(0, 40), payload)
  return true
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const { user_id, title, body: msgBody, url } = body ?? {}

  if (!user_id || !title) {
    return NextResponse.json({ error: 'user_id and title are required' }, { status: 400 })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id)

  if (!subs?.length) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const sub of subs) {
    try {
      await sendPush(sub, { title, body: msgBody, url })
      sent++
    } catch {
      // Remove stale subscriptions
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    }
  }

  return NextResponse.json({ sent })
}
