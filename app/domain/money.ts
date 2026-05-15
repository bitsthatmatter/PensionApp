/** Euro-invoer → eurocent (bijv. 1234.56 → 123456) */
export function euroToEurocents(euro: number): number {
  return Math.round(euro * 100)
}
