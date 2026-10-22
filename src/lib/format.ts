// Числа с пробелом между разрядами (20 283), дроби с запятой (38,4%)
const NB = ' '

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'н/д'
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB)
  return n < 0 ? `-${s}` : s
}

export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return 'н/д'
  const fixed = Math.abs(n).toFixed(digits)
  const [i, d] = fixed.split('.')
  const s = i.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (d ? `,${d}` : '')
  return n < 0 ? `-${s}` : s
}

export const fmtPct = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? 'н/д' : `${fmtNum(n, digits)}%`)
export function fmtSignedPct(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'н/д'
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmtNum(Math.abs(n), digits)}%`
}
export function fmtSignedPp(n: number | null | undefined) {
  if (n === null || n === undefined) return 'н/д'
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${fmtNum(Math.abs(n), 1)}${NB}п.п.`
}
export const fmtDays = (n: number | null | undefined) => (n === null || n === undefined ? 'н/д' : `${Math.round(n)}${NB}дн.`)
export const fmtDate = (iso: string) => iso.split('-').reverse().join('.')
export const fmtRatio = (n: number | null | undefined) => (n === null || n === undefined ? 'н/д' : `${fmtNum(n, 2)}×`)

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}
