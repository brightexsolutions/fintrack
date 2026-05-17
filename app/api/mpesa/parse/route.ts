import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { parseMpesaBatch } from '@/lib/mpesa/parser'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.sms_text || typeof body.sms_text !== 'string') {
    return NextResponse.json({ error: 'sms_text is required' }, { status: 400 })
  }

  const result = parseMpesaBatch(body.sms_text)
  const workspaceId = typeof body.workspace_id === 'string' && body.workspace_id.trim() ? body.workspace_id : null
  const refs = result.parsed.map((transaction) => transaction.mpesa_ref).filter((ref): ref is string => Boolean(ref))

  let duplicateRefs: string[] = []

  if (refs.length > 0) {
    let duplicateQuery = supabase.from('transactions').select('mpesa_ref').in('mpesa_ref', refs)

    if (workspaceId) {
      duplicateQuery = duplicateQuery.eq('workspace_id', workspaceId)
    } else {
      duplicateQuery = duplicateQuery.eq('user_id', user.id).is('workspace_id', null)
    }

    const { data: existingRefs } = await duplicateQuery
    duplicateRefs = Array.from(
      new Set(
        (existingRefs ?? [])
          .map((row) => row.mpesa_ref)
          .filter((ref): ref is string => Boolean(ref))
      )
    )
  }

  return NextResponse.json({
    ...result,
    duplicate_refs: duplicateRefs,
  })
}
