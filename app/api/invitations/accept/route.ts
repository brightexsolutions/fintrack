import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { token } = body ?? {}
  if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

  // Look up the invitation
  const { data: inv, error: invErr } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (invErr || !inv) {
    return NextResponse.json({ error: 'Invitation not found or already used' }, { status: 404 })
  }

  // Check expiry
  if (new Date(inv.expires_at) < new Date()) {
    await supabase.from('workspace_invitations').update({ status: 'expired' }).eq('id', inv.id)
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Check user email matches invite
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.email !== inv.invitee_email) {
    return NextResponse.json(
      { error: `This invitation was sent to ${inv.invitee_email}. Please sign in with that account.` },
      { status: 403 }
    )
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('id, is_active')
    .eq('workspace_id', inv.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.is_active) {
      // Already a member — just mark invitation accepted
      await supabase.from('workspace_invitations').update({ status: 'accepted' }).eq('id', inv.id)
      return NextResponse.json({ workspace_id: inv.workspace_id })
    }
    // Re-activate
    const { error: reErr } = await supabase
      .from('workspace_members')
      .update({ is_active: true, role: inv.role })
      .eq('id', existing.id)
    if (reErr) return NextResponse.json({ error: reErr.message }, { status: 500 })
  } else {
    // Insert new member
    const { error: memErr } = await supabase.from('workspace_members').insert({
      workspace_id: inv.workspace_id,
      user_id: user.id,
      role: inv.role,
    })
    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })
  }

  // Mark invitation accepted
  await supabase.from('workspace_invitations').update({ status: 'accepted' }).eq('id', inv.id)

  return NextResponse.json({ workspace_id: inv.workspace_id })
}
