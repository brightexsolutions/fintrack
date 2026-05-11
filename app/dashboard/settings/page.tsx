'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Bell, Palette, User, Globe, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useProfile, useUpdateProfile, SUPPORTED_CURRENCIES } from '@/hooks/use-profile'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useTheme } from 'next-themes'

const TIMEZONES = [
  'Africa/Nairobi',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Accra',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
]

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-border/60">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const { theme, setTheme } = useTheme()
  const { isSubscribed, isSupported, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications()

  const [fullName, setFullName] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [notifPrefs, setNotifPrefs] = useState({
    budget_alerts: true,
    weekly_digest: true,
    payment_reminders: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setCurrency(profile.preferred_currency)
      setTimezone(profile.timezone)
      setNotifPrefs(profile.notification_prefs)
    }
  }, [profile])

  async function saveAll() {
    setSaving(true)
    await updateProfile.mutateAsync({
      full_name: fullName,
      preferred_currency: currency,
      timezone,
      notification_prefs: notifPrefs,
    })
    setSaving(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-32" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Section title="Profile" icon={User}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile?.email ?? ''} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
        </div>
      </Section>

      {/* Regional */}
      <Section title="Regional" icon={Globe}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Default currency</Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Used for formatting amounts across the app.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={Palette}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Choose your preferred display mode</p>
          </div>
          <div className="flex gap-1.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={theme === t ? 'default' : 'outline'}
                className={`h-8 px-3 text-xs capitalize ${theme === t ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={() => setTheme(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </Section>

      {/* Notifications (in-app) */}
      <Section title="Notifications" icon={Bell}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Budget alerts</p>
              <p className="text-xs text-muted-foreground">Alert when a budget reaches its threshold</p>
            </div>
            <Switch
              checked={notifPrefs.budget_alerts}
              onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, budget_alerts: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Weekly digest</p>
              <p className="text-xs text-muted-foreground">Weekly summary of income and expenses</p>
            </div>
            <Switch
              checked={notifPrefs.weekly_digest}
              onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, weekly_digest: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Payment reminders</p>
              <p className="text-xs text-muted-foreground">Remind before debt and subscription due dates</p>
            </div>
            <Switch
              checked={notifPrefs.payment_reminders}
              onCheckedChange={(v) => setNotifPrefs((p) => ({ ...p, payment_reminders: v }))}
            />
          </div>

          {/* Web Push toggle */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Push notifications</p>
                <p className="text-xs text-muted-foreground">
                  {!isSupported
                    ? 'Not supported in this browser'
                    : isSubscribed
                      ? 'Enabled — you will receive push alerts'
                      : 'Enable to receive alerts even when the app is closed'}
                </p>
              </div>
              {isSupported && (
                <Switch
                  checked={isSubscribed}
                  disabled={pushLoading}
                  onCheckedChange={(v) => v ? subscribe() : unsubscribe()}
                />
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Export */}
      <Section title="Data Export" icon={Download}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Export transactions</p>
            <p className="text-xs text-muted-foreground">Download all your transactions as a CSV file</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open('/api/export', '_blank')}
          >
            <Download className="h-3.5 w-3.5" /> Download CSV
          </Button>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}
