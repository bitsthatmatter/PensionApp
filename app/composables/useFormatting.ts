import type { Age } from '~/types/financial'

const currencyFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
})

const dateFormatter = new Intl.DateTimeFormat('nl-NL', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function useFormatting() {
  function formatCurrency(value: number): string {
    return currencyFormatter.format(value)
  }

  function formatDate(isoDate: string): string {
    return dateFormatter.format(new Date(isoDate))
  }

  function formatAge(age: Age): string {
    if (age.months === 0) return `${age.years} jaar`
    return `${age.years} jaar en ${age.months} maanden`
  }

  return { formatCurrency, formatDate, formatAge }
}
