import { describe, it, expect } from 'vitest'
import { euroToEurocents } from './money'
import { useFormatting } from '~/composables/useFormatting'

const { formatEurocents } = useFormatting()

// ---------------------------------------------------------------------------
// euroToEurocents
// ---------------------------------------------------------------------------
describe('euroToEurocents', () => {
  it('converteert gehele euros correct', () => {
    expect(euroToEurocents(0)).toBe(0)
    expect(euroToEurocents(1000)).toBe(100_000)
  })

  it('converteert decimale euros correct', () => {
    expect(euroToEurocents(1.5)).toBe(150)
    expect(euroToEurocents(1.99)).toBe(199)
  })

  it('rondt floating-point onnauwkeurigheden af', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
    expect(euroToEurocents(0.1 + 0.2)).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// formatEurocents
// ---------------------------------------------------------------------------
describe('formatEurocents', () => {
  it('formatteert correct naar euro-notatie zonder centen', () => {
    // Intl.NumberFormat uses a non-breaking space (U+00A0) between € and the number
    expect(formatEurocents(100_000)).toBe('€\u00a01.000')
    expect(formatEurocents(1_234_500)).toBe('€\u00a012.345')
  })

  it('formatteert nul correct', () => {
    expect(formatEurocents(0)).toBe('€\u00a00')
  })

  it('rondt af op hele euros (geen centen)', () => {
    // 100_050 eurocent = €1000.50 → rounds to €1.001 (nearest euro)
    expect(formatEurocents(100_050)).toBe('€\u00a01.001')
  })
})
