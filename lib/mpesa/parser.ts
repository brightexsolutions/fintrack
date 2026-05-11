export type MpesaTransactionType =
  | 'sent'
  | 'received'
  | 'buy_goods'
  | 'withdraw'
  | 'airtime'
  | 'paybill'
  | 'fuliza'
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
  const m = sms.match(/M-PESA balance is Ksh([\d,]+\.?\d*)/i)
  return m ? parseAmount(m[1]) : null
}

function parseFee(sms: string): number | null {
  const m = sms.match(/Transaction cost,?\s*Ksh([\d,]+\.?\d*)/i)
  return m ? parseAmount(m[1]) : null
}

function parseTimestamp(sms: string): Date | null {
  // "17/9/24 at 3:16 PM" or "9/1/24 at 11:02 AM" (DD/M/YY DD/MM/YYYY formats)
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
  // "Ksh500.00 sent to KPLC PREPAID for account 12345"
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
  // "Ksh2,100.00 sent to BRIAN MBUGUA 0723447655"
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
  // "You have received Ksh500.00 from JOHN DOE 0700000000"
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
  // "Ksh150.00 paid to JAVA HOUSE." (till — no phone number)
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
  // "You have withdrawn Ksh1,000.00 from"
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
  // "Ksh50.00 sent to your Safaricom airtime"
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

function matchFuliza(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Fuliza M-PESA.*?Ksh([\d,]+\.?\d*)/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'fuliza',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: 'Safaricom Fuliza',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: 'Fuliza M-Pesa repayment',
    raw: sms,
  }
}

const matchers = [matchPaybill, matchSent, matchReceived, matchBuyGoods, matchWithdraw, matchAirtime, matchFuliza]

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
  // Split on blank lines or lines starting with a transaction ref
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

  return { parsed, skipped }
}
