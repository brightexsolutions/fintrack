'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, Users } from 'lucide-react'
import Link from 'next/link'

type InviteState = 'loading' | 'ready' | 'accepting' | 'success' | 'error'

interface InviteDetails {
  workspace_name: string
  invitee_email: string
  role: string
  expires_at: string
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [state, setState] = useState<InviteState>('loading')
  const [invite, setInvite] = useState<InviteDetails | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single()
        setUserEmail(profile?.email ?? user.email ?? null)
      }

      // Fetch via API route — uses service role to bypass RLS on workspaces join
      const res = await fetch(`/api/invitations/accept?token=${encodeURIComponent(token)}`)
      const json = await res.json()

      if (!res.ok) {
        setState('error')
        setErrorMsg(res.status === 410 ? 'This invitation link has expired.' : 'This invitation link is invalid or has already been used.')
        return
      }

      setInvite({
        workspace_name: json.workspace_name,
        invitee_email: json.invitee_email,
        role: json.role,
        expires_at: json.expires_at,
      })
      setState('ready')
    }

    load()
  }, [token])

  async function accept() {
    setState('accepting')
    try {
      const res = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Failed to accept invitation.')
        setState('error')
        return
      }
      setState('success')
      setTimeout(() => router.push('/dashboard/workspace'), 2000)
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setState('error')
    }
  }

  const roleLabel: Record<string, string> = {
    admin: 'Admin — full access',
    editor: 'Editor — add & edit',
    viewer: 'Viewer — read only',
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">FinTrack</h1>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {state === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading invitation…</p>
            </div>
          )}

          {(state === 'ready' || state === 'accepting') && invite && (
            <>
              <div>
                <h2 className="text-lg font-semibold">You&apos;re invited!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Join <span className="font-medium text-foreground">{invite.workspace_name}</span> as{' '}
                  <span className="font-medium text-foreground">{invite.role}</span>.
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Workspace</span>
                  <span className="font-medium">{invite.workspace_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{roleLabel[invite.role] ?? invite.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Invited email</span>
                  <span className="font-medium">{invite.invitee_email}</span>
                </div>
              </div>

              {userEmail && userEmail !== invite.invitee_email && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                  You&apos;re signed in as <strong>{userEmail}</strong> but this invitation is for{' '}
                  <strong>{invite.invitee_email}</strong>. Please sign in with the correct account.
                </div>
              )}

              {!userEmail && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  You need to be signed in to accept this invitation.{' '}
                  <Link href={`/login?redirect=/invite/${token}`} className="text-foreground underline underline-offset-2">
                    Sign in
                  </Link>{' '}
                  or{' '}
                  <Link href={`/register?redirect=/invite/${token}`} className="text-foreground underline underline-offset-2">
                    create an account
                  </Link>.
                </div>
              )}

              {userEmail && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={accept}
                  disabled={state === 'accepting' || userEmail !== invite.invitee_email}
                >
                  {state === 'accepting' ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accepting…</>
                  ) : 'Accept invitation'}
                </Button>
              )}
            </>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-semibold">Invitation accepted!</p>
              <p className="text-sm text-muted-foreground">Redirecting to workspaces…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="font-semibold">Unable to accept invitation</p>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Go to dashboard</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
