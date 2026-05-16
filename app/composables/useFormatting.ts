import { Temporal } from 'temporal-polyfill'
import type { Age } from '~/types/financial'

const currencyFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

// Whole-euro formatter for eurocent values (no fractional cents shown).
const eurocentFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const dateFormatOptions: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

export function useFormatting() {
  function formatCurrency(value: number): string {
    return currencyFormatter.format(value)
  }

  /** Formats a eurocent integer as a whole-euro display string (e.g. 123456 → "€ 1.235"). */
  function formatEurocents(eurocents: number): string {
    return eurocentFormatter.format(eurocents / 100)
  }

  function formatDate(isoDate: string): string {
    return Temporal.PlainDate.from(isoDate).toLocaleString('nl-NL', dateFormatOptions)
  }

  function formatAge(age: Age): string {
    if (age.months === 0) return `${age.years} jaar`
    return `${age.years} jaar en ${age.months} maanden`
  }

  /** Formats an IBAN string in groups of 4 characters, e.g. "NL49INGB0001234567" → "NL49 INGB 0001 2345 67". */
  function formatIban(iban: string): string {
    const stripped = iban.replace(/\s+/g, '').toUpperCase()
    return stripped.match(/.{1,4}/g)?.join(' ') ?? stripped
  }

  return { formatCurrency, formatEurocents, formatDate, formatAge, formatIban }
}
