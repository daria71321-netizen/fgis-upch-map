import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MONTHS, PARTIAL_MONTH, VEDS } from '../config/reference'
import type { VedId, CategoryCode } from '../config/reference'
import type { MetricId } from '../config/thresholds'

export type VedFilter = VedId | 'all'
export type Mode = 'min' | 'gov'

export interface Filters {
  ved: VedFilter
  topic: string | null
  metric: MetricId
  cat: CategoryCode | null
  period: string
  status: string | null
  inst: boolean
  mode: Mode
}

export const DEFAULT_PERIOD = '2026'
const METRIC_IDS: MetricId[] = ['rate', 'dyn', 'days', 'restored', 'repeat']

export function parseFilters(sp: URLSearchParams): Filters {
  const v = sp.get('ved')
  const ved: VedFilter = VEDS.some((x) => x.id === v) ? (v as VedId) : 'all'
  const topicRaw = sp.get('topic')
  const topic = ved !== 'all' && VEDS.find((x) => x.id === ved)!.topics.some((t) => t.id === topicRaw) ? topicRaw : null
  const m = sp.get('metric') as MetricId
  const p = sp.get('p') ?? DEFAULT_PERIOD
  return {
    ved,
    topic,
    metric: METRIC_IDS.includes(m) ? m : 'rate',
    cat: (sp.get('cat') as CategoryCode) || null,
    period: periodRange(p) ? p : DEFAULT_PERIOD,
    status: sp.get('status'),
    inst: sp.get('inst') === '1',
    mode: sp.get('mode') === 'gov' ? 'gov' : 'min',
  }
}

const KEYS: Record<keyof Filters, string> = {
  ved: 'ved', topic: 'topic', metric: 'metric', cat: 'cat', period: 'p', status: 'status', inst: 'inst', mode: 'mode',
}
const DEFAULTS: Partial<Record<keyof Filters, string>> = { ved: 'all', metric: 'rate', period: DEFAULT_PERIOD, mode: 'min' }

export function filtersToSearch(f: Partial<Filters>, base?: URLSearchParams): string {
  const sp = new URLSearchParams(base)
  for (const [k, val] of Object.entries(f) as [keyof Filters, unknown][]) {
    const key = KEYS[k]
    let s: string | null = val === null || val === undefined || val === false ? null : val === true ? '1' : String(val)
    if (s !== null && DEFAULTS[k] === s) s = null
    if (s === null) sp.delete(key)
    else sp.set(key, s)
  }
  const q = sp.toString()
  return q ? `?${q}` : ''
}

export function useFilters() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => parseFilters(sp), [sp])
  const set = useCallback(
    (patch: Partial<Filters>) => {
      const next = { ...patch }
      // при смене ведомства тема сбрасывается
      if ('ved' in patch && patch.ved !== filters.ved && !('topic' in patch)) next.topic = null
      setSp(new URLSearchParams(filtersToSearch(next, sp).slice(1)), { replace: false })
    },
    [sp, setSp, filters.ved],
  )
  /** Строка запроса для ссылок, сохраняющая текущие фильтры */
  const qs = useCallback((patch: Partial<Filters> = {}) => filtersToSearch(patch, sp), [sp])
  return { filters, set, qs, sp }
}

// ---------- Периоды ----------
export interface PeriodOpt { id: string; label: string }

export const PERIOD_OPTIONS: PeriodOpt[] = [
  { id: '2026', label: '2026 год (по 22 октября)' },
  { id: '12m', label: 'Последние 12 месяцев' },
  { id: '2026q3', label: 'III квартал 2026' },
  { id: '2026q2', label: 'II квартал 2026' },
  { id: '2026q1', label: 'I квартал 2026' },
  { id: '2026-09', label: 'Сентябрь 2026' },
  { id: '2025', label: '2025 год' },
  { id: '2024', label: '2024 год' },
]

const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export const monthLabel = (ym: string, short = false) => {
  const [y, m] = ym.split('-').map(Number)
  return short ? `${MONTH_SHORT[m - 1]} ${String(y).slice(2)}` : `${MONTH_NAMES[m - 1]} ${y}`
}

/** Диапазон индексов месяцев [from, to] включительно, или null при неверном формате */
export function periodRange(p: string): [number, number] | null {
  const idx = (ym: string) => MONTHS.indexOf(ym)
  let m: RegExpMatchArray | null
  if (p === '12m') return [MONTHS.length - 12, MONTHS.length - 1]
  if ((m = p.match(/^(\d{4})$/))) {
    const a = idx(`${m[1]}-01`)
    if (a < 0) return null
    const b = MONTHS.findLastIndex((x) => x.startsWith(m![1]))
    return [a, b]
  }
  if ((m = p.match(/^(\d{4})q([1-4])$/))) {
    const a = idx(`${m[1]}-${String((+m[2] - 1) * 3 + 1).padStart(2, '0')}`)
    if (a < 0) return null
    return [a, Math.min(a + 2, MONTHS.length - 1)]
  }
  if ((m = p.match(/^(\d{4}-\d{2})$/))) {
    const a = idx(m[1])
    return a < 0 ? null : [a, a]
  }
  if ((m = p.match(/^(\d{4}-\d{2})_(\d{4}-\d{2})$/))) {
    const a = idx(m[1]), b = idx(m[2])
    return a < 0 || b < a ? null : [a, b]
  }
  return null
}

export function periodLabel(p: string): string {
  const o = PERIOD_OPTIONS.find((x) => x.id === p)
  if (o) return o.label
  const r = periodRange(p)
  if (!r) return p
  if (r[0] === r[1]) return monthLabel(MONTHS[r[0]])
  return `${monthLabel(MONTHS[r[0]], true)} - ${monthLabel(MONTHS[r[1]], true)}`
}

/** Месяцы для сравнения с прошлым годом и коэффициент (неполный текущий месяц сравниваем пропорционально) */
export function prevYearWeights(r: [number, number]): { idx: number; w: number }[] {
  const out: { idx: number; w: number }[] = []
  for (let i = r[0]; i <= r[1]; i++) {
    if (i - 12 < 0) continue
    out.push({ idx: i - 12, w: MONTHS[i] === PARTIAL_MONTH ? 22 / 31 : 1 })
  }
  return out
}
