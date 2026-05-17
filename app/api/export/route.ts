import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { format, parseISO } from 'date-fns'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('from')
  const dateTo = searchParams.get('to')
  const scope = searchParams.get('scope') === 'workspace' ? 'workspace' : 'personal'
  const workspaceId = searchParams.get('workspace_id')

  let query = supabase
    .from('transactions')
    .select('*, category:categories(name)')
    .order('transaction_date', { ascending: false })

  if (scope === 'workspace' && workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    query = query.eq('user_id', user.id).is('workspace_id', null)
  }

  if (dateFrom) query = query.gte('transaction_date', dateFrom)
  if (dateTo) query = query.lte('transaction_date', dateTo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Description', 'Category', 'Payment Method', 'M-Pesa Ref', 'Counterparty', 'Notes', 'Status']

  const csvLines = [
    headers.join(','),
    ...rows.map((t) => {
      const cat = t.category as { name: string } | null
      return [
        escapeCsv(format(parseISO(t.transaction_date), 'yyyy-MM-dd HH:mm')),
        escapeCsv(t.type),
        escapeCsv(t.amount),
        escapeCsv(t.currency),
        escapeCsv(t.description),
        escapeCsv(cat?.name ?? ''),
        escapeCsv(t.payment_method),
        escapeCsv(t.mpesa_ref),
        escapeCsv(t.counterparty),
        escapeCsv(t.notes),
        escapeCsv(t.status),
      ].join(',')
    }),
  ]

  const csv = csvLines.join('\n')
  const filename = `fintrack-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
