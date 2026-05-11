export type MpesaTransactionType =
  | 'sent'
  | 'received'
  | 'buy_goods'
  | 'withdraw'
  | 'airtime'
  | 'paybill'
  | 'fuliza'           // Fuliza credit used — notification paired with actual transaction
  | 'fuliza_repayment' // Automatic repayment deducted when money arrives
  | 'mshwari'          // M-Shwari ↔ M-PESA transfer
  | 'unknown'

export interface ParsedMpesaTransaction {
  mpesa_ref: string | null
  type: 'income' | 'expense'
  mpesa_type: MpesaTransactionType
  amount: number
  fee: number | null
  balance_after: number | null
  counterparty: string | null
  counterparty_number: string | null
  timestamp: Date | null
  description: string
  raw: string
  // Fuliza-specific extras
  fuliza_outstanding?: number | null
  fuliza_due_date?: string | null
}

export interface ParseResult {
  parsed: ParsedMpesaTransaction[]
  skipped: Array<{ line: string; reason: string }>
}

// ─── Helpers ────────────────────────────────────────────────
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ''))
}

function parseRef(sms: string): string | null {
  const m = sms.match(/^([A-Z0-9]{8,12})\s+Confirmed/i)
  return m?.[1] ?? null
}

function parseBalance(sms: string): number | null {
  // Standard: "M-PESA balance is Ksh1,234.56"
  let m = sms.match(/M-PESA balance is Ksh([\d,]+\.?\d*)/i)
  if (m) return parseAmount(m[1])
  // Fuliza repayment: "Your M-PESA balance is 400.35"
  m = sms.match(/Your M-PESA balance is ([\d,]+\.?\d*)/i)
  return m ? parseAmount(m[1]) : null
}

function parseFee(sms: string): number | null {
  const m = sms.match(/Transaction cost,?\s*Ksh\.?\s*([\d,]+\.?\d*)/i)
  return m ? parseAmount(m[1]) : null
}

function parseTimestamp(sms: string): Date | null {
  const m = sms.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*([AP]M)/i)
  if (!m) return null
  try {
    const [, day, month, rawYear, hour, min, ampm] = m
    const year = rawYear.length === 2 ? 2000 + parseInt(rawYear, 10) : parseInt(rawYear, 10)
    let h = parseInt(hour, 10)
    if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0
    const date = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10), h, parseInt(min, 10))
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

// ─── Pattern matchers (order matters — more specific first) ─

function matchPaybill(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Confirmed\.?\s+Ksh([\d,]+\.?\d*)\s+sent to\s+(.+?)\s+for account\s+(\S+)/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'paybill',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: m[2].trim(),
    counterparty_number: m[3],
    timestamp: parseTimestamp(sms),
    description: `Paybill: ${m[2].trim()} (${m[3]})`,
    raw: sms,
  }
}

function matchSent(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Confirmed\.?\s+Ksh([\d,]+\.?\d*)\s+sent to\s+(.+?)\s+(254\d{9}|\d{9,10})\s+on/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'sent',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: m[2].trim(),
    counterparty_number: m[3],
    timestamp: parseTimestamp(sms),
    description: `Sent to ${m[2].trim()}`,
    raw: sms,
  }
}

function matchReceived(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/received Ksh([\d,]+\.?\d*)\s+from\s+(.+?)\s+(254\d{9}|\d{9,10})/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'income',
    mpesa_type: 'received',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: m[2].trim(),
    counterparty_number: m[3],
    timestamp: parseTimestamp(sms),
    description: `Received from ${m[2].trim()}`,
    raw: sms,
  }
}

function matchBuyGoods(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Confirmed\.?\s+Ksh([\d,]+\.?\d*)\s+paid to\s+(.+?)\.\s+on/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'buy_goods',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: m[2].trim(),
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Buy goods: ${m[2].trim()}`,
    raw: sms,
  }
}

function matchWithdraw(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/withdrawn Ksh([\d,]+\.?\d*)\s+from\s+(.+?)\s+New/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'withdraw',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: m[2]?.trim() ?? null,
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Withdrawal${m[2] ? `: ${m[2].trim()}` : ''}`,
    raw: sms,
  }
}

function matchAirtime(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Ksh([\d,]+\.?\d*)\s+sent to your\s+(.+?)\s+airtime/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'airtime',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: m[2]?.trim() ?? 'Safaricom',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Airtime: ${m[2]?.trim() ?? 'Safaricom'}`,
    raw: sms,
  }
}

// Fuliza credit notification — "Fuliza M-PESA amount is Ksh X. Access Fee charged Ksh Y."
// This arrives paired with the actual transaction SMS (same ref). It means the transaction
// was funded partly/fully by the Fuliza overdraft credit line. Not a separate expense.
function matchFulizaCredit(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(
    /Fuliza M-PESA amount is Ksh\s*([\d,]+\.?\d*)\.?\s+Access Fee charged Ksh\s*([\d,]+\.?\d*)\.\s+Total Fuliza M-PESA outstanding amount is Ksh([\d,]+\.?\d*)\s+due on (\d{2}\/\d{2}\/\d{2,4})/i
  )
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'fuliza',
    amount: parseAmount(m[1]),
    fee: parseAmount(m[2]), // access fee
    balance_after: null,     // no balance in these notifications
    counterparty: 'Safaricom Fuliza',
    counterparty_number: null,
    timestamp: null,
    description: `Fuliza credit used: Ksh ${m[1]}`,
    raw: sms,
    fuliza_outstanding: parseAmount(m[3]),
    fuliza_due_date: m[4],
  }
}

// Fuliza automatic repayment — "Ksh X from your M-PESA has been used to pay your outstanding Fuliza"
// This fires when money arrives and Safaricom auto-deducts Fuliza balance first.
function matchFulizaRepayment(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(
    /Ksh\s*([\d,]+\.?\d*)\s+from your M-PESA has been used to .+?pay your outstanding Fuliza M-PESA/i
  )
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'fuliza_repayment',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: 'Safaricom Fuliza',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Fuliza repayment: Ksh ${m[1]}`,
    raw: sms,
  }
}

// M-Shwari ↔ M-PESA transfer — income when money moves from savings to wallet
function matchMShwari(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Ksh([\d,]+\.?\d*)\s+transferred from M-Shwari account/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'income',
    mpesa_type: 'mshwari',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: 'M-Shwari',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `M-Shwari transfer: Ksh ${m[1]}`,
    raw: sms,
  }
}

// Order matters — repayment must be checked before generic Fuliza credit
const matchers = [
  matchPaybill,
  matchSent,
  matchReceived,
  matchBuyGoods,
  matchWithdraw,
  matchAirtime,
  matchMShwari,
  matchFulizaRepayment,
  matchFulizaCredit,
]

export function parseMpesaSms(sms: string): ParsedMpesaTransaction | null {
  const cleaned = sms.replace(/\n/g, ' ').trim()
  if (!cleaned.toLowerCase().includes('confirmed')) return null
  for (const matcher of matchers) {
    const result = matcher(cleaned)
    if (result) return result
  }
  return null
}

export function parseMpesaBatch(rawText: string): ParseResult {
  const lines = rawText
    .split(/\n{2,}/)
    .map((l) => l.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  const parsed: ParsedMpesaTransaction[] = []
  const skipped: ParseResult['skipped'] = []

  for (const line of lines) {
    const result = parseMpesaSms(line)
    if (result) {
      parsed.push(result)
    } else {
      skipped.push({ line, reason: 'Unrecognized M-Pesa format' })
    }
  }

  // Deduplicate same-ref pairs: when a Fuliza credit notification and the actual
  // transaction (paybill/sent/buy_goods) share a ref, keep the real transaction only.
  // The Fuliza notification is redundant — the expense is already captured.
  const byRef = new Map<string, ParsedMpesaTransaction[]>()
  const noRef: ParsedMpesaTransaction[] = []

  for (const tx of parsed) {
    if (!tx.mpesa_ref) {
      noRef.push(tx)
    } else {
      const group = byRef.get(tx.mpesa_ref) ?? []
      group.push(tx)
      byRef.set(tx.mpesa_ref, group)
    }
  }

  const deduped: ParsedMpesaTransaction[] = [...noRef]

  for (const group of Array.from(byRef.values())) {
    if (group.length === 1) {
      deduped.push(group[0])
      continue
    }

    // If the group has a Fuliza credit AND a real transaction, drop the Fuliza credit
    const fulizaIdx = group.findIndex((t: ParsedMpesaTransaction) => t.mpesa_type === 'fuliza')
    const realIdx = group.findIndex((t: ParsedMpesaTransaction) => t.mpesa_type !== 'fuliza')

    if (fulizaIdx !== -1 && realIdx !== -1) {
      // Keep the real transaction, annotate it with Fuliza info
      const real = { ...group[realIdx] }
      const fuliza = group[fulizaIdx]
      real.fuliza_outstanding = fuliza.fuliza_outstanding
      real.fuliza_due_date = fuliza.fuliza_due_date
      real.description = `${real.description} (via Fuliza)`
      deduped.push(real)
      // Other entries in the group (if any) get pushed as-is
      group.forEach((t: ParsedMpesaTransaction, i: number) => {
        if (i !== fulizaIdx && i !== realIdx) deduped.push(t)
      })
    } else {
      // No Fuliza pairing — push all
      group.forEach((t: ParsedMpesaTransaction) => deduped.push(t))
    }
  }

  // Sort by timestamp ascending (preserves original order for null timestamps)
  deduped.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return a.timestamp.getTime() - b.timestamp.getTime()
  })

  return { parsed: deduped, skipped }
}
