export type MpesaTransactionType =
  | 'sent'
  | 'received'
  | 'buy_goods'
  | 'withdraw'
  | 'airtime'
  | 'paybill'
  | 'fuliza'            // Fuliza credit notification (paired with real tx)
  | 'fuliza_repayment'  // Auto-repayment deducted when money arrives
  | 'mshwari'          // M-Shwari → M-PESA (savings withdrawal)
  | 'mshwari_out'      // M-PESA → M-Shwari (savings deposit) — is_transfer
  | 'mshwari_loan'     // M-Shwari loan approved → M-PESA
  | 'kcb_mpesa'        // KCB M-Pesa transfer or loan
  | 'okoa_jahazi'      // Okoa Jahazi airtime advance
  | 'charge'           // M-PESA service charge
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
  is_transfer?: boolean       // true for internal pocket moves (M-Shwari/KCB savings)
  fuliza_outstanding?: number | null
  fuliza_due_date?: string | null
}

export interface ParseResult {
  parsed: ParsedMpesaTransaction[]
  skipped: Array<{ line: string; reason: string }>
  duplicate_refs?: string[]
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
  let m = sms.match(/M-PESA balance is Ksh([\d,]+\.?\d*)/i)
  if (m) return parseAmount(m[1])
  m = sms.match(/Your M-PESA balance is ([\d,]+\.?\d*)/i)
  return m ? parseAmount(m[1]) : null
}

function parseFee(sms: string): number | null {
  const m = sms.match(/Transaction cost,?\s*Ksh\.?\s*([\d,]+\.?\d*)/i)
  return m ? parseAmount(m[1]) : null
}

function parseTimestamp(sms: string): Date | null {
  // "at" is optional — some Safaricom SMS omit it (e.g. M-Shwari loan approval)
  const m = sms.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(?:at\s+)?(\d{1,2}):(\d{2})\s*([AP]M)/i)
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

// ─── WhatsApp wrapper stripper ──────────────────────────────
// Handles formats like:
//   [00:45, 12/05/2026] Name: message...
//   [12:30 PM, 5/12/2025] John Doe: message...
//   12:45 - Name: message...
const WHATSAPP_HEADER_RE = /^\[[\d:,\s\/APMapm]+\]\s+[^:]+:\s*/
const WHATSAPP_DASH_RE = /^\d{1,2}:\d{2}(?:\s*[APM]{2})?\s+-\s+[^:]+:\s*/i

function stripWhatsAppWrapper(text: string): string {
  return text
    .replace(WHATSAPP_HEADER_RE, '')
    .replace(WHATSAPP_DASH_RE, '')
    .trim()
}

// A bare ref code on its own line (e.g. "UEDO93OMC1") that Safaricom sometimes
// puts on line 1 while "Confirmed." starts on line 2.
const STANDALONE_REF_RE = /^([A-Z0-9]{8,12})\s*$/

function isMessageStart(line: string): boolean {
  const stripped = stripWhatsAppWrapper(line)
  return [
    /^[A-Z0-9]{8,12}\s+Confirmed/i,
    /^Confirmed\.?/i,
    /^Fuliza M-PESA amount is/i,
    /^Ksh\s*[\d,]+\.?\d*\s+from your M-PESA has been used/i,
    /^Ksh\s*[\d,]+\.?\d*\s+transferred from M-Shwari account/i,
    /^Ksh\s*[\d,]+\.?\d*\s+transferred from KCB M-PESA/i,
    /^You have sent Ksh/i,
    /^You have received Ksh/i,
    /^Your M-Shwari loan/i,
    /^Dear Customer,\s*your M-Shwari loan/i,
    /^Dear Customer,\s*your KCB M-PESA loan/i,
    /^Okoa Jahazi of Ksh/i,
    /^Your M-PESA account has been debited Ksh/i,
  ].some((pattern) => pattern.test(stripped))
}

function splitMpesaMessages(rawText: string): string[] {
  const normalized = rawText.replace(/\r/g, '').trim()
  if (!normalized) return []

  // First try blank-line splitting
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, ' ').trim())
    .filter(Boolean)

  if (blocks.length > 1) return blocks.map(stripWhatsAppWrapper).filter(Boolean)

  // Single block: split by detecting message starts, stripping WhatsApp wrappers per line
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const messages: string[] = []
  let buffer = ''
  // When Safaricom puts the ref code on its own line, carry it forward so the
  // next line ("Confirmed. ...") can be prefixed with it.
  let pendingRef = ''

  for (const line of lines) {
    const clean = stripWhatsAppWrapper(line)
    if (!clean) continue

    // Bare ref code on its own line — hold it until the next line arrives
    const refOnly = STANDALONE_REF_RE.exec(clean)
    if (refOnly) {
      if (buffer) {
        messages.push(buffer.replace(/\s+/g, ' ').trim())
        buffer = ''
      }
      pendingRef = refOnly[1]
      continue
    }

    // If we have a pending ref, prepend it so the next line gets its ref back
    const cleanWithRef = pendingRef ? `${pendingRef} ${clean}` : clean
    pendingRef = ''

    if (!buffer) {
      buffer = cleanWithRef
      continue
    }

    if (isMessageStart(line)) {
      messages.push(buffer.replace(/\s+/g, ' ').trim())
      buffer = cleanWithRef
      continue
    }

    buffer = `${buffer} ${clean}`.trim()
  }

  if (buffer) messages.push(buffer.replace(/\s+/g, ' ').trim())

  return messages.filter(Boolean)
}

function guessSkipReason(line: string): string {
  // Not a financial message at all
  if (!/ksh|m-pesa|fuliza|m-shwari|kcb|okoa|confirmed/i.test(line)) {
    if (/amount you can transact|sign up for lipa|earn interest|save frequent|ziidi mmf|https?:\/\//i.test(line)) {
      return 'Promotional or informational text — not a transaction'
    }
    return 'Not a recognised M-Pesa message'
  }

  // M-Shwari balance notification (no money moved)
  if (/M-Shwari Deposit Account balance is/i.test(line)) {
    return 'M-Shwari balance notification — no money moved, balance check only'
  }

  // Balance inquiry result
  if (/Your account balance was:/i.test(line)) {
    return 'Account balance inquiry — not a transaction'
  }

  // "Sent" message without phone number (saved contact)
  const isSentMsg = /sent\s+Ksh[\d,]+/i.test(line) || /Ksh[\d,]+\.?\d*\s+sent\s+to/i.test(line)
  if (isSentMsg && !/\d{9,12}\s+on/i.test(line) && !/for account/i.test(line)) {
    return 'Send to saved contact — phone number missing from SMS; could not parse recipient'
  }

  // M-Shwari loan with unrecognised format
  if (/m-shwari loan/i.test(line)) {
    return 'M-Shwari loan message — format not recognised'
  }

  // Received without date anchor (truly unparseable)
  if (/received\s+Ksh/i.test(line) && !/\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(line)) {
    return 'Received money — date missing from SMS; could not parse'
  }

  // Looks like a Fuliza message but regex didn't match
  if (/fuliza/i.test(line)) {
    return 'Fuliza message — format not fully recognised (may be missing outstanding amount or due date)'
  }

  // Withdrawal without clear agent/balance
  if (/withdrawn|withdraw/i.test(line)) {
    return 'Withdrawal message — format not recognised'
  }

  return 'Unsupported or incomplete M-Pesa format'
}

// ─── Pattern matchers (order matters — more specific first) ─

function matchPaybill(sms: string): ParsedMpesaTransaction | null {
  // Modern Safaricom: "Confirmed. Ksh50.00 sent to NAME for account ACC on DATE"
  // Account field can be multi-word (e.g. "SAFARICOM DATA BUNDLES"), so use (.+?) anchored by \s+on\s+\d
  const mNew = sms.match(/Ksh([\d,]+\.?\d*)\s+sent\s+to\s+(.+?)\s+for\s+account\s+(.+?)\s+on\s+\d/i)
  // Legacy: "You have sent Ksh50.00 to NAME for account ACC on DATE"
  const mOld = sms.match(/(?:You have\s+)?sent\s+Ksh([\d,]+\.?\d*)\s+to\s+(.+?)\s+for\s+account\s+(.+?)\s+on\s+\d/i)
  const m = mNew ?? mOld
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
  // With phone number — modern: "Ksh X sent to NAME 07XXXXXXXX on DATE"
  const mPhoneNew = sms.match(/Ksh([\d,]+\.?\d*)\s+sent\s+to\s+(.+?)\s+(254\d{9}|\d{9,10})\s+on/i)
  // With phone number — legacy: "sent Ksh X to NAME 07XXXXXXXX on DATE"
  const mPhoneOld = sms.match(/(?:You have\s+)?sent\s+Ksh([\d,]+\.?\d*)\s+to\s+(.+?)\s+(254\d{9}|\d{9,10})\s+on/i)
  const mPhone = mPhoneNew ?? mPhoneOld
  if (mPhone) {
    return {
      mpesa_ref: parseRef(sms),
      type: 'expense',
      mpesa_type: 'sent',
      amount: parseAmount(mPhone[1]),
      fee: parseFee(sms),
      balance_after: parseBalance(sms),
      counterparty: mPhone[2].trim(),
      counterparty_number: mPhone[3],
      timestamp: parseTimestamp(sms),
      description: `Sent to ${mPhone[2].trim()}`,
      raw: sms,
    }
  }
  // Saved contact — no phone. Exclude paybill ("for account") to avoid stealing from matchPaybill
  if (/for account/i.test(sms)) return null
  // Modern: "Ksh X sent to NAME on DATE"
  const mSavedNew = sms.match(/Ksh([\d,]+\.?\d*)\s+sent\s+to\s+(.+?)\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i)
  // Legacy: "sent Ksh X to NAME on DATE"
  const mSavedOld = sms.match(/(?:You have\s+)?sent\s+Ksh([\d,]+\.?\d*)\s+to\s+(.+?)\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i)
  const mSaved = mSavedNew ?? mSavedOld
  if (!mSaved) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'sent',
    amount: parseAmount(mSaved[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: mSaved[2].trim(),
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Sent to ${mSaved[2].trim()}`,
    raw: sms,
  }
}

function matchReceived(sms: string): ParsedMpesaTransaction | null {
  // Full phone present (unmasked): "received Ksh X from NAME 07XXXXXXXX on"
  const mPhone = sms.match(/(?:You have\s+)?received\s+Ksh([\d,]+\.?\d*)\s+from\s+(.+?)\s+(254\d{9}|\d{9,10})\s+on/i)
  if (mPhone) {
    return {
      mpesa_ref: parseRef(sms),
      type: 'income',
      mpesa_type: 'received',
      amount: parseAmount(mPhone[1]),
      fee: null,
      balance_after: parseBalance(sms),
      counterparty: mPhone[2].trim(),
      counterparty_number: mPhone[3],
      timestamp: parseTimestamp(sms),
      description: `Received from ${mPhone[2].trim()}`,
      raw: sms,
    }
  }
  // Masked phone (0710***021) or institution name with no phone — anchor on date
  const mAny = sms.match(/(?:You have\s+)?received\s+Ksh([\d,]+\.?\d*)\s+from\s+(.+?)\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i)
  if (!mAny) return null
  // Extract anything that looks like a phone (including masked) from the counterparty field
  const cpRaw = mAny[2].trim()
  const phoneMatch = cpRaw.match(/((?:254|\+254|0)\d[\d*]{8,9})$/)
  const counterparty = phoneMatch ? cpRaw.slice(0, cpRaw.length - phoneMatch[0].length).trim() : cpRaw
  const counterparty_number = phoneMatch ? phoneMatch[0] : null
  return {
    mpesa_ref: parseRef(sms),
    type: 'income',
    mpesa_type: 'received',
    amount: parseAmount(mAny[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: counterparty || cpRaw,
    counterparty_number,
    timestamp: parseTimestamp(sms),
    description: `Received from ${counterparty || cpRaw}`,
    raw: sms,
  }
}

function matchBuyGoods(sms: string): ParsedMpesaTransaction | null {
  // Standard: "Ksh X paid to MERCHANT on DATE"
  const mPaid = sms.match(/(?:Confirmed\.?\s+)?Ksh([\d,]+\.?\d*)\s+paid to\s+(.+?)(?:\.\s+|\s+on)/i)
  if (mPaid) {
    return {
      mpesa_ref: parseRef(sms),
      type: 'expense',
      mpesa_type: 'buy_goods',
      amount: parseAmount(mPaid[1]),
      fee: parseFee(sms),
      balance_after: parseBalance(sms),
      counterparty: mPaid[2].trim(),
      counterparty_number: null,
      timestamp: parseTimestamp(sms),
      description: `Buy goods: ${mPaid[2].trim()}`,
      raw: sms,
    }
  }
  // Lipa Na M-Pesa till "Give" format: "Give Ksh X cash to MERCHANT"
  const mGive = sms.match(/Give Ksh([\d,]+\.?\d*)\s+cash\s+to\s+(.+?)(?:\s+New\s+M-PESA|\s+on\s+\d|\.)/i)
  if (!mGive) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'buy_goods',
    amount: parseAmount(mGive[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: mGive[2].trim(),
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Buy goods: ${mGive[2].trim()}`,
    raw: sms,
  }
}

function matchWithdraw(sms: string): ParsedMpesaTransaction | null {
  // Handles both "withdrawn" (old) and "Withdraw" (new Safaricom format)
  const m = sms.match(/[Ww]ithdrawn?\s+Ksh([\d,]+\.?\d*)\s+from\s+(.+?)(?:\s+New|\s+on\s+\d|\s+Transaction cost|\.)/i)
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
  // Self airtime: "Ksh X sent to your Safaricom airtime account"
  const mSelf = sms.match(/Ksh([\d,]+\.?\d*)\s+sent to your\s+(.+?)\s+airtime(?:\s+account)?/i)
  if (mSelf) {
    return {
      mpesa_ref: parseRef(sms),
      type: 'expense',
      mpesa_type: 'airtime',
      amount: parseAmount(mSelf[1]),
      fee: null,
      balance_after: parseBalance(sms),
      counterparty: mSelf[2]?.trim() ?? 'Safaricom',
      counterparty_number: null,
      timestamp: parseTimestamp(sms),
      description: `Airtime: ${mSelf[2]?.trim() ?? 'Safaricom'}`,
      raw: sms,
    }
  }
  // Third-party airtime: "You bought Ksh X of airtime for 07XXXXXXXX on DATE"
  const mBought = sms.match(/You bought Ksh([\d,]+\.?\d*)\s+of airtime for\s+([\d+]+)/i)
  if (mBought) {
    return {
      mpesa_ref: parseRef(sms),
      type: 'expense',
      mpesa_type: 'airtime',
      amount: parseAmount(mBought[1]),
      fee: null,
      balance_after: parseBalance(sms),
      counterparty: 'Safaricom',
      counterparty_number: mBought[2],
      timestamp: parseTimestamp(sms),
      description: `Airtime for ${mBought[2]}`,
      raw: sms,
    }
  }
  // Self airtime (new format): "You bought Ksh X of airtime on DATE" — no phone
  const mSelfBought = sms.match(/You bought Ksh([\d,]+\.?\d*)\s+of airtime\b/i)
  if (!mSelfBought) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'airtime',
    amount: parseAmount(mSelfBought[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: 'Safaricom',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Airtime: Ksh ${mSelfBought[1]}`,
    raw: sms,
  }
}

// Transfer TO M-Shwari savings — internal pocket move (not a real expense)
function matchMShwariOut(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Ksh([\d,]+\.?\d*)\s+transferred to M-Shwari account/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'mshwari_out',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: 'M-Shwari',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Transfer to M-Shwari: Ksh ${m[1]}`,
    raw: sms,
    is_transfer: true,
  }
}

// Transfer FROM M-Shwari savings — internal pocket move (not a real income)
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
    description: `Transfer from M-Shwari: Ksh ${m[1]}`,
    raw: sms,
    is_transfer: true,
  }
}

// M-Shwari loan approved → deposited to M-PESA (income, not a transfer)
// Real format: "Your M-Shwari loan has been approved on DATE and Ksh X less excise duty has been deposited to your M-PESA account"
// Alt format:  "M-Shwari loan of Ksh X has been approved ... deposited to your M-PESA"
function matchMShwariLoan(sms: string): ParsedMpesaTransaction | null {
  // Real Safaricom format — amount appears AFTER approval notice
  const mReal = sms.match(/Your M-Shwari loan has been approved.*?Ksh\s*([\d,]+\.?\d*)\s+less excise duty has been deposited to your M-PESA/i)
  if (mReal) {
    return {
      mpesa_ref: parseRef(sms),
      type: 'income',
      mpesa_type: 'mshwari_loan',
      amount: parseAmount(mReal[1]),
      fee: null,
      balance_after: parseBalance(sms),
      counterparty: 'M-Shwari',
      counterparty_number: null,
      timestamp: parseTimestamp(sms),
      description: `M-Shwari loan: Ksh ${mReal[1]}`,
      raw: sms,
      is_transfer: true,
    }
  }
  // Alternative format — amount before approval notice
  const mAlt = sms.match(/M-Shwari loan of Ksh\s*([\d,]+\.?\d*)\s+has been approved.*deposited to your M-PESA/i)
  if (!mAlt) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'income',
    mpesa_type: 'mshwari_loan',
    amount: parseAmount(mAlt[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: 'M-Shwari',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `M-Shwari loan: Ksh ${mAlt[1]}`,
    raw: sms,
    is_transfer: true,
  }
}

// Transfer TO KCB M-Pesa savings — internal pocket move (note: Safaricom typo "transfered")
function matchKcbMpesaOut(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Ksh\s*([\d,]+\.?\d*)\s+transfere?d\s+to\s+KCB M-PESA account/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'kcb_mpesa',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: 'KCB M-Pesa',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Transfer to KCB M-Pesa: Ksh ${m[1]}`,
    raw: sms,
    is_transfer: true,
  }
}

// M-Shwari loan repayment — money leaving M-PESA/M-Shwari to repay the loan (includes interest)
// NOT marked is_transfer: loan disbursement is is_transfer (not real income), so
// the repayment should be a real expense so the interest cost is captured in spending.
function matchMShwariRepay(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Loan of Ksh\s*([\d,]+\.?\d*)\s+repaid from your M-(?:PESA|Shwari)/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'expense',
    mpesa_type: 'mshwari_out',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: 'M-Shwari',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `M-Shwari loan repayment: Ksh ${m[1]}`,
    raw: sms,
  }
}

// KCB M-Pesa transfer from KCB to M-PESA (income, is_transfer)
// Old: "Ksh X transferred from KCB M-PESA"
// New: "You have transfered Ksh X from your KCB M-PESA account" (Safaricom typo: one 'r')
function matchKcbMpesaIn(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/(?:You have\s+)?transfere?d\s+Ksh\s*([\d,]+\.?\d*)\s+from\s+(?:your\s+)?KCB M-PESA/i)
  if (!m) return null
  return {
    mpesa_ref: parseRef(sms),
    type: 'income',
    mpesa_type: 'kcb_mpesa',
    amount: parseAmount(m[1]),
    fee: parseFee(sms),
    balance_after: parseBalance(sms),
    counterparty: 'KCB M-Pesa',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Transfer from KCB M-Pesa: Ksh ${m[1]}`,
    raw: sms,
    is_transfer: true,
  }
}

// KCB M-Pesa loan approved → deposited to M-PESA
// Marked is_transfer: loan money is not real income; repayment will be an expense
function matchKcbLoan(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/KCB M-PESA loan of Ksh\s*([\d,]+\.?\d*)\s+has been (?:approved|deposited)/i)
  if (!m) {
    // Alternative format: "Your KCB M-PESA account has been credited with KSH X"
    const m2 = sms.match(/KCB M-PESA account has been credited with (?:KSH|Ksh)\s*([\d,]+\.?\d*)/i)
    if (!m2) return null
    return {
      mpesa_ref: parseRef(sms),
      type: 'income',
      mpesa_type: 'kcb_mpesa',
      amount: parseAmount(m2[1]),
      fee: null,
      balance_after: parseBalance(sms),
      counterparty: 'KCB M-Pesa',
      counterparty_number: null,
      timestamp: parseTimestamp(sms),
      description: `KCB M-Pesa loan: Ksh ${m2[1]}`,
      raw: sms,
      is_transfer: true,
    }
  }
  return {
    mpesa_ref: parseRef(sms),
    type: 'income',
    mpesa_type: 'kcb_mpesa',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: 'KCB M-Pesa',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `KCB M-Pesa loan: Ksh ${m[1]}`,
    raw: sms,
    is_transfer: true,
  }
}

// Okoa Jahazi airtime advance
function matchOkoaJahazi(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/Okoa Jahazi of Ksh\s*([\d,]+\.?\d*)\s+loaded/i)
  if (!m) return null
  return {
    mpesa_ref: null,
    type: 'expense',
    mpesa_type: 'okoa_jahazi',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: null,
    counterparty: 'Safaricom',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `Okoa Jahazi: Ksh ${m[1]}`,
    raw: sms,
  }
}

// M-PESA service charge deduction
function matchCharge(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(/M-PESA account has been debited Ksh\s*([\d,]+\.?\d*)\s+as (?:a\s+)?(?:M-PESA\s+)?charge/i)
  if (!m) return null
  return {
    mpesa_ref: null,
    type: 'expense',
    mpesa_type: 'charge',
    amount: parseAmount(m[1]),
    fee: null,
    balance_after: parseBalance(sms),
    counterparty: 'Safaricom',
    counterparty_number: null,
    timestamp: parseTimestamp(sms),
    description: `M-PESA charge: Ksh ${m[1]}`,
    raw: sms,
  }
}

// Fuliza credit notification — "Fuliza M-PESA amount is Ksh X. Access Fee charged Ksh Y."
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
    fee: parseAmount(m[2]),
    balance_after: null,
    counterparty: 'Safaricom Fuliza',
    counterparty_number: null,
    timestamp: null,
    description: `Fuliza credit used: Ksh ${m[1]}`,
    raw: sms,
    fuliza_outstanding: parseAmount(m[3]),
    fuliza_due_date: m[4],
  }
}

// Fuliza automatic repayment — "fully pay" clears outstanding (fuliza_outstanding = 0)
// so syncFulizaDebt can auto-settle the debt record when full repayment is imported.
function matchFulizaRepayment(sms: string): ParsedMpesaTransaction | null {
  const m = sms.match(
    /Ksh\s*([\d,]+\.?\d*)\s+from your M-PESA has been used to (fully|partially) pay your outstanding Fuliza M-PESA/i
  )
  if (!m) return null
  const isFullyPaid = /fully/i.test(m[2])
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
    fuliza_outstanding: isFullyPaid ? 0 : null,
  }
}

// Order matters — more specific matchers before generic ones
const matchers = [
  matchPaybill,
  matchSent,
  matchReceived,
  matchBuyGoods,
  matchWithdraw,
  matchAirtime,
  matchMShwariOut,      // before matchMShwari (both match "M-Shwari")
  matchMShwari,
  matchMShwariLoan,
  matchMShwariRepay,    // loan repayment — before generic mshwari
  matchKcbMpesaOut,     // before matchKcbMpesaIn (both match "KCB M-PESA")
  matchKcbMpesaIn,
  matchKcbLoan,
  matchOkoaJahazi,
  matchCharge,
  matchFulizaRepayment, // before matchFulizaCredit
  matchFulizaCredit,
]

export function parseMpesaSms(sms: string): ParsedMpesaTransaction | null {
  const cleaned = sms.replace(/\s+/g, ' ').trim()
  for (const matcher of matchers) {
    const result = matcher(cleaned)
    if (result) return result
  }
  return null
}

export function parseMpesaBatch(rawText: string): ParseResult {
  const lines = splitMpesaMessages(rawText)

  const parsed: ParsedMpesaTransaction[] = []
  const skipped: ParseResult['skipped'] = []

  for (const line of lines) {
    const result = parseMpesaSms(line)
    if (result) {
      parsed.push(result)
    } else {
      skipped.push({ line, reason: guessSkipReason(line) })
    }
  }

  // Deduplicate same-ref pairs: when a Fuliza credit notification and the actual
  // transaction share a ref, keep the real transaction, annotate it with Fuliza data.
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

    const fulizaIdx = group.findIndex((t: ParsedMpesaTransaction) => t.mpesa_type === 'fuliza')
    const realIdx = group.findIndex((t: ParsedMpesaTransaction) => t.mpesa_type !== 'fuliza')

    if (fulizaIdx !== -1 && realIdx !== -1) {
      const real = { ...group[realIdx] }
      const fuliza = group[fulizaIdx]
      real.fuliza_outstanding = fuliza.fuliza_outstanding
      real.fuliza_due_date = fuliza.fuliza_due_date
      real.description = `${real.description} (via Fuliza)`
      deduped.push(real)
      group.forEach((t: ParsedMpesaTransaction, i: number) => {
        if (i !== fulizaIdx && i !== realIdx) deduped.push(t)
      })
    } else {
      group.forEach((t: ParsedMpesaTransaction) => deduped.push(t))
    }
  }

  deduped.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return a.timestamp.getTime() - b.timestamp.getTime()
  })

  return { parsed: deduped, skipped }
}
