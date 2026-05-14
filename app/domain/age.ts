import { Temporal } from 'temporal-polyfill'
import type { Age } from '~/types/financial'

export function ageToMonths(age: Age): number {
  return age.years * 12 + age.months
}

export function monthsToAge(totalMonths: number): Age {
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 }
}

export function addMonthsToDate(isoDate: string, months: number): string {
  return Temporal.PlainDate.from(isoDate).add({ months }).toString()
}

export function ageAtDate(dob: string, date: string): Age {
  const birth = Temporal.PlainDate.from(dob)
  const target = Temporal.PlainDate.from(date)
  const diff = birth.until(target, { largestUnit: 'years' })
  return { years: diff.years, months: diff.months }
}
