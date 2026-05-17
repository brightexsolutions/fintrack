import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendWorkspaceInviteEmail, getAppUrl, isMailConfigured } from '@/lib/communications/mail'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const inviteeEmail = typeof body?.invitee_email === 'string' ? body.invitee_email.trim().toLowerCase() : ''
  const role = typeof body?.role === 'string' ? body.role : ''

  if (!inviteeEmail || !role) {
    return NextResponse.json({ error: 'invitee_email and role are required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const { data: invitation, error } = await supabase
    .from('workspace_invitations')
    .insert({
      workspace_id: workspaceId,
      inviter_id: user.id,
      invitee_email: inviteeEmail,
      role,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const inviteUrl = `${getAppUrl()}/invite/${invitation.token}`
  let emailSent = false

  if (isMailConfigured()) {
    try {
      await sendWorkspaceInviteEmail({
        to: inviteeEmail,
        workspaceName: workspace?.name ?? 'your workspace',
        inviterName: inviterProfile?.full_name || inviterProfile?.email || 'A FinTrack user',
        inviteUrl,
        role,
      })
      emailSent = true
    } catch (sendError) {
      console.error('Failed to send workspace invite email', sendError)
    }
  }

  return NextResponse.json({
    invitation,
    email_sent: emailSent,
    invite_url: inviteUrl,
  })
}
