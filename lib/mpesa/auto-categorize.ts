import type { ParsedMpesaTransaction } from './parser'
import type { Category } from '@/types/database'
import type { CategorizationRule } from '@/hooks/use-categorization'

// Rules applied in order — first match wins.
// Pattern can match counterparty, description, or mpesa_type.
const SYSTEM_RULES: Array<{
  match: (tx: ParsedMpesaTransaction) => boolean
  categoryName: string
}> = [
  // M-Pesa type-based rules (most reliable)
  { match: (t) => t.mpesa_type === 'airtime', categoryName: 'Airtime & Data' },
  { match: (t) => t.mpesa_type === 'okoa_jahazi', categoryName: 'Airtime & Data' },
  { match: (t) => t.mpesa_type === 'charge', categoryName: 'M-Pesa Charges' },
  { match: (t) => t.mpesa_type === 'mshwari_out' || t.mpesa_type === 'mshwari', categoryName: 'Savings Transfer' },
  { match: (t) => t.mpesa_type === 'kcb_mpesa', categoryName: 'Savings Transfer' },
  { match: (t) => t.mpesa_type === 'mshwari_loan', categoryName: 'Other Income' },
  { match: (t) => t.mpesa_type === 'fuliza' || t.mpesa_type === 'fuliza_repayment', categoryName: 'M-Pesa Charges' },

  // Counterparty keyword rules
  {
    match: (t) => /safaricom data bundle|data bundle|bundles/i.test(t.counterparty ?? '') ||
      /data bundle|airtime/i.test(t.description),
    categoryName: 'Airtime & Data',
  },
  {
    match: (t) => /kplc|kenya power|nairobi water|county|rates|rent|water|electricity|fiber|faiba|zuku|safaricom home/i
      .test(t.counterparty ?? ''),
    categoryName: 'Bills & Utilities',
  },
  {
    match: (t) => /naivas|quickmart|carrefour|market|grocery|supermarket|uchumi|tuskys|cleanshelf|spar/i
      .test(t.counterparty ?? ''),
    categoryName: 'Food & Dining',
  },
  {
    match: (t) => /restaurant|hotel|cafe|kfc|chicken|pizza|java|artcaffe|mcdonald|burger|food|snack|canteen/i
      .test(t.counterparty ?? ''),
    categoryName: 'Food & Dining',
  },
  {
    match: (t) => /uber|bolt|little cab|faras|taxi|matatu|bus|transit|transport|fuel|petrol|oil libya|total energies|kenol|shell/i
      .test(t.counterparty ?? ''),
    categoryName: 'Transport',
  },
  {
    match: (t) => /hospital|clinic|pharmacy|chemist|doctor|medical|health|lab/i
      .test(t.counterparty ?? ''),
    categoryName: 'Healthcare',
  },
  {
    match: (t) => /school|college|university|tuition|exam|fees|education/i
      .test(t.counterparty ?? ''),
    categoryName: 'Education',
  },
  {
    match: (t) => /netflix|showmax|spotify|dstv|gotv|startimes|cinema|movie/i
      .test(t.counterparty ?? ''),
    categoryName: 'Entertainment',
  },
  {
    match: (t) => /salary|payroll|employer/i.test(t.description) && t.type === 'income',
    categoryName: 'Salary',
  },
]

function matchesUserRule(tx: ParsedMpesaTransaction, rule: CategorizationRule): boolean {
  const kw = rule.keyword.toLowerCase()
  const cp = (tx.counterparty ?? '').toLowerCase()
  const desc = tx.description.toLowerCase()
  switch (rule.match_field) {
    case 'counterparty': return cp.includes(kw)
    case 'description': return desc.includes(kw)
    case 'any': return cp.includes(kw) || desc.includes(kw)
  }
}

export function autoCategorize(
  tx: ParsedMpesaTransaction,
  categories: Category[],
  userRules: CategorizationRule[] = [],
): string | null {
  const catById = new Map(categories.map((c) => [c.id, c.id]))
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

  // User rules checked first
  for (const rule of userRules) {
    if (catById.has(rule.category_id) && matchesUserRule(tx, rule)) {
      return rule.category_id
    }
  }

  // System rules fallback
  for (const rule of SYSTEM_RULES) {
    if (rule.match(tx)) {
      const id = catByName.get(rule.categoryName.toLowerCase())
      if (id) return id
    }
  }

  return null
}
