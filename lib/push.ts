import webpush from 'web-push'
import { createAdminClient } from './supabase/admin'

let vapidSet = false

function ensureVapid() {
  if (vapidSet) return
  if (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  ) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    )
    vapidSet = true
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url = '/dashboard') {
  ensureVapid()
  if (!vapidSet) return

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
  if (!subs?.length) return

  const payload = JSON.stringify({ title, body, url, icon: '/icon-192.png' })
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload
      )
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }
}
