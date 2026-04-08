import type { Age } from '~/types/financial'

export function ageToMonths(age: Age): number {
  return age.years * 12 + age.months
}

export function monthsToAge(totalMonths: number): Age {
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 }
}

export function addMonthsToDate(isoDate: string, months: number): string {
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function ageAtDate(dob: string, date: string): Age {
  const birth = new Date(dob)
  const target = new Date(date)
  let years = target.getFullYear() - birth.getFullYear()
  let months = target.getMonth() - birth.getMonth()
  if (target.getDate() < birth.getDate()) months--
  if (months < 0) {
    years--
    months += 12
  }
  return { years, months }
}
