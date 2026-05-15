import { describe, it, expect } from 'vitest'
import { ageToMonths, monthsToAge, addMonthsToDate, ageAtDate, dateAtAge } from './age'

// ---------------------------------------------------------------------------
// ageToMonths / monthsToAge
// ---------------------------------------------------------------------------
describe('ageToMonths', () => {
  it('converts years and months to total months', () => {
    expect(ageToMonths({ years: 0, months: 0 })).toBe(0)
    expect(ageToMonths({ years: 1, months: 0 })).toBe(12)
    expect(ageToMonths({ years: 67, months: 3 })).toBe(807)
  })

  it('round-trips with monthsToAge', () => {
    for (const total of [0, 1, 11, 12, 13, 807, 840]) {
      expect(ageToMonths(monthsToAge(total))).toBe(total)
    }
  })
})

describe('monthsToAge', () => {
  it('returns { years: 0, months: 0 } for 0', () => {
    expect(monthsToAge(0)).toEqual({ years: 0, months: 0 })
  })

  it('keeps months in [0, 11]', () => {
    expect(monthsToAge(11)).toEqual({ years: 0, months: 11 })
    expect(monthsToAge(12)).toEqual({ years: 1, months: 0 })
    expect(monthsToAge(13)).toEqual({ years: 1, months: 1 })
  })

  it('round-trips with ageToMonths', () => {
    for (const age of [
      { years: 0, months: 0 },
      { years: 0, months: 11 },
      { years: 36, months: 0 },
      { years: 67, months: 3 },
    ]) {
      expect(monthsToAge(ageToMonths(age))).toEqual(age)
    }
  })
})

// ---------------------------------------------------------------------------
// addMonthsToDate
// ---------------------------------------------------------------------------
describe('addMonthsToDate', () => {
  it('adds months to a mid-month date', () => {
    expect(addMonthsToDate('2026-01-15', 1)).toBe('2026-02-15')
    expect(addMonthsToDate('2026-01-15', 12)).toBe('2027-01-15')
  })

  it('clamps Jan 31 + 1 month to the last day of February (leap year)', () => {
    // 2024 is a leap year: Feb has 29 days
    expect(addMonthsToDate('2024-01-31', 1)).toBe('2024-02-29')
  })

  it('clamps Jan 31 + 1 month to Feb 28 in a non-leap year', () => {
    expect(addMonthsToDate('2023-01-31', 1)).toBe('2023-02-28')
  })

  it('restores full month length after clamping (Jan 31 + 2 months = Mar 31)', () => {
    expect(addMonthsToDate('2024-01-31', 2)).toBe('2024-03-31')
  })

  it('handles adding 0 months', () => {
    expect(addMonthsToDate('2026-06-15', 0)).toBe('2026-06-15')
  })
})

// ---------------------------------------------------------------------------
// dateAtAge
// ---------------------------------------------------------------------------
describe('dateAtAge', () => {
  it('returns the date on which someone reaches a given age', () => {
    expect(dateAtAge('1990-06-15', { years: 36, months: 0 })).toBe('2026-06-15')
  })

  it('handles a non-zero months component', () => {
    expect(dateAtAge('1990-01-15', { years: 67, months: 3 })).toBe('2057-04-15')
  })

  it('round-trips with ageAtDate', () => {
    const dob = '1985-03-20'
    const age = { years: 40, months: 5 }
    expect(ageAtDate(dob, dateAtAge(dob, age))).toEqual(age)
  })
})

// ---------------------------------------------------------------------------
// ageAtDate
// ---------------------------------------------------------------------------
describe('ageAtDate', () => {
  it('returns 0 years 0 months on the day of birth', () => {
    expect(ageAtDate('1990-06-15', '1990-06-15')).toEqual({ years: 0, months: 0 })
  })

  it('returns correct age on an exact birthday', () => {
    expect(ageAtDate('1990-06-15', '2026-06-15')).toEqual({ years: 36, months: 0 })
  })

  it('returns correct age before the birthday in the target year', () => {
    // March 2026 is before the June birthday — still 35
    expect(ageAtDate('1990-06-15', '2026-03-01')).toEqual({ years: 35, months: 8 })
  })

  it('does not increment months on the day before a full month', () => {
    // One day short of a full month after the birthday
    expect(ageAtDate('1990-06-15', '2026-07-14')).toEqual({ years: 36, months: 0 })
  })

  it('handles leap-year birthday: born Feb 28, target Feb 28 next year', () => {
    expect(ageAtDate('1990-02-28', '1991-02-28')).toEqual({ years: 1, months: 0 })
  })

  it('handles leap-year birthday: born Feb 28, target Feb 29 in a leap year', () => {
    expect(ageAtDate('1990-02-28', '1992-02-29')).toEqual({ years: 2, months: 0 })
  })

  it('months component is always in [0, 11]', () => {
    for (let m = 0; m < 12; m++) {
      const target = `2026-${String(m + 1).padStart(2, '0')}-15`
      const age = ageAtDate('1990-01-15', target)
      expect(age.months).toBeGreaterThanOrEqual(0)
      expect(age.months).toBeLessThanOrEqual(11)
    }
  })
})
