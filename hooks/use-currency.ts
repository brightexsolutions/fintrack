'use client'

import { useProfile } from './use-profile'

export function useCurrency() {
  const { data: profile } = useProfile()
  const currency = profile?.preferred_currency ?? 'KES'

  function format(amount: number): string {
    try {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${currency} ${amount.toFixed(2)}`
    }
  }

  return { format, currency }
}
