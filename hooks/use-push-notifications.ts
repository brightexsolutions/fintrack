'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Set your VAPID public key in .env.local:
// NEXT_PUBLIC_VAPID_PUBLIC_KEY=<base64url key>
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buffer
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const isConfigured = Boolean(VAPID_PUBLIC_KEY)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      // Register SW
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub)
        })
      }).catch(() => {})
    }
  }, [])

  async function subscribe() {
    if (!isConfigured) {
      return
    }
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const json = sub.toJSON()
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: json.endpoint!,
          p256dh: json.keys?.p256dh ?? '',
          auth_key: json.keys?.auth ?? '',
        }, { onConflict: 'user_id,endpoint' })
      }
      setIsSubscribed(true)
      toast.success('Push notifications enabled')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('blocked')) {
        toast.error('Notification permission denied. Allow notifications in your browser/phone settings, then try again.')
      } else if (msg.includes('applicationServerKey') || msg.includes('VAPID') || msg.includes('key')) {
        toast.error('Push configuration error — contact support.')
      } else {
        toast.error(`Push setup failed: ${msg.slice(0, 80)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
        }
      }
      setIsSubscribed(false)
      toast.success('Push notifications disabled')
    } catch {
      toast.error('Failed to disable push notifications')
    } finally {
      setLoading(false)
    }
  }

  return { isSupported, isConfigured, isSubscribed, loading, subscribe, unsubscribe }
}
