// Расчеты показателей. Все проценты считаются из абсолютных значений,
// федеральные значения складываются из региональных.
import { REGIONS, VEDS, MONTHS, regionStatus, catOfSub, vedById } from '../config/reference'
import type { RegionStatus, VedId, CategoryCode } from '../config/reference'
import { classOf } from '../config/thresholds'
import type { MetricId } from '../config/thresholds'
import { periodRange, prevYearWeights } from '../state/filters'
import type { VedFilter } from '../state/filters'
import type { DemoData, Series } from './types'

export interface Agg {
  n: number // жалоб за период (все регионы с данными, включая «Оценку»)
  prev: number // за тот же период прошлого года
  nc: number // жалоб в подключенных регионах (база для долей)
  ans: number; dsum: number; late: number; done: number; viol: number; rest: number; rep: number
}
export const emptyAgg = (): Agg => ({ n: 0, prev: 0, nc: 0, ans: 0, dsum: 0, late: 0, done: 0, viol: 0, rest: 0, rep: 0 })

export function addSeries(a: Agg, s: Series, r: [number, number]) {
  const prevW = prevYearWeights(r)
  for (let i = r[0]; i <= r[1]; i++) {
    a.n += s.n[i]
    if (s.ans) {
      a.nc += s.n[i]; a.ans += s.ans[i]; a.dsum += s.dsum![i]; a.late += s.late![i]
      a.done += s.done![i]; a.viol += s.viol![i]; a.rest += s.rest![i]; a.rep += s.rep![i]
    }
  }
  for (const { idx, w } of prevW) a.prev += s.n[idx] * w
}

export interface Sel { ved: VedFilter; topic?: string | null; cat?: CategoryCode | null; region?: string | null }

const subOf = new Map<string, string>()
for (const v of VEDS) for (const t of v.topics) subOf.set(`${v.id}|${t.id}`, t.sub)
export const catOfSeries = (s: { v: VedId; t: string }) => catOfSub(subOf.get(`${s.v}|${s.t}`)!)
export const topicName = (v: VedId, t: string) => vedById.get(v)!.topics.find((x) => x.id === t)?.name ?? t

export function match(s: Series, sel: Sel) {
  if (sel.ved !== 'all' && s.v !== sel.ved) return false
  if (sel.topic && s.t !== sel.topic) return false
  if (sel.cat && catOfSeries(s) !== sel.cat) return false
  if (sel.region && s.r !== sel.region) return false
  return true
}

export function aggregate(data: DemoData, sel: Sel, period: string): Agg {
  const r = periodRange(period)!
  const a = emptyAgg()
  for (const s of data.series) if (match(s, sel)) addSeries(a, s, r)
  return a
}

// ---------- Производные показатели ----------
export const popOf = (iso: string) => REGIONS.find((x) => x.iso === iso)!.pop
export const POP_WITH_DATA = REGIONS.filter((r) => regionStatus(r.iso) !== 'nodata').reduce((a, r) => a + r.pop, 0)
/** жалоб на 10 тыс. жителей; pop в тыс. человек */
export const per10k = (n: number, pop: number) => (pop > 0 ? (n * 10) / pop : 0)
export const dynPct = (a: Agg) => (a.prev > 0 ? (a.n / a.prev - 1) * 100 : null)
export const avgDays = (a: Agg) => (a.ans > 0 ? a.dsum / a.ans : null)
export const latePct = (a: Agg) => (a.ans > 0 ? (a.late / a.ans) * 100 : null)
export const restoredPct = (a: Agg) => (a.viol > 0 ? (a.rest / a.viol) * 100 : null)
export const repeatPct = (a: Agg) => (a.nc > 0 ? (a.rep / a.nc) * 100 : null)

export interface RegionStat {
  iso: string
  status: RegionStatus
  agg: Agg
  rate: number // на 10 тыс.
  ratio: number // к среднему по России
  values: Record<MetricId, number | null>
  cls: Record<MetricId, number | null>
}

export function nationalRate(data: DemoData, sel: Sel, period: string) {
  const a = aggregate(data, { ...sel, region: null }, period)
  return per10k(a.n, POP_WITH_DATA)
}

export function regionStats(data: DemoData, sel: Sel, period: string): Map<string, RegionStat> {
  const r = periodRange(period)!
  const by = new Map<string, Agg>()
  for (const s of data.series) {
    if (!match(s, { ...sel, region: null })) continue
    let a = by.get(s.r)
    if (!a) by.set(s.r, (a = emptyAgg()))
    addSeries(a, s, r)
  }
  let N = 0
  for (const a of by.values()) N += a.n
  const natRate = per10k(N, POP_WITH_DATA)
  const out = new Map<string, RegionStat>()
  for (const reg of REGIONS) {
    const status = regionStatus(reg.iso)
    const agg = by.get(reg.iso) ?? emptyAgg()
    const rate = per10k(agg.n, reg.pop)
    const ratio = natRate > 0 ? rate / natRate : 0
    const conn = status === 'connected'
    const values: Record<MetricId, number | null> = {
      rate: status === 'nodata' ? null : ratio,
      dyn: status === 'nodata' ? null : dynPct(agg),
      days: conn ? avgDays(agg) : null,
      restored: conn ? restoredPct(agg) : null,
      repeat: conn ? repeatPct(agg) : null,
    }
    const cls = Object.fromEntries(
      (Object.keys(values) as MetricId[]).map((k) => [k, values[k] === null ? null : classOf(k, k === 'days' ? Math.round(values[k]!) : values[k]!)]),
    ) as Record<MetricId, number | null>
    out.set(reg.iso, { iso: reg.iso, status, agg, rate, ratio, values, cls })
  }
  return out
}

/** Помесячный ряд за год, в который попадает конец периода, и тот же ряд прошлого года */
export function monthly(data: DemoData, sel: Sel, period: string) {
  const r = periodRange(period)!
  const year = MONTHS[r[1]].slice(0, 4)
  const rows: { m: string; cur: number | null; prev: number | null; partial: boolean }[] = []
  for (let mm = 1; mm <= 12; mm++) {
    const ym = `${year}-${String(mm).padStart(2, '0')}`
    const pym = `${+year - 1}-${String(mm).padStart(2, '0')}`
    const i = MONTHS.indexOf(ym), j = MONTHS.indexOf(pym)
    let cur = i >= 0 ? 0 : null, prev = j >= 0 ? 0 : null
    for (const s of data.series) {
      if (!match(s, sel)) continue
      if (i >= 0) cur! += s.n[i]
      if (j >= 0) prev! += s.n[j]
    }
    rows.push({ m: ym, cur, prev, partial: i === MONTHS.length - 1 })
  }
  return rows
}

/** Распределение по темам (или по ведомствам при «Все ведомства») с динамикой */
export function byTopic(data: DemoData, sel: Sel, period: string) {
  const r = periodRange(period)!
  const groups = new Map<string, { key: string; name: string; ved: VedId; topic: string | null; agg: Agg }>()
  for (const s of data.series) {
    if (!match(s, { ...sel, topic: null })) continue
    const key = sel.ved === 'all' ? s.v : `${s.v}|${s.t}`
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { key, name: sel.ved === 'all' ? vedById.get(s.v)!.short : topicName(s.v, s.t), ved: s.v, topic: sel.ved === 'all' ? null : s.t, agg: emptyAgg() }))
    addSeries(g.agg, s, r)
  }
  const list = [...groups.values()].sort((a, b) => b.agg.n - a.agg.n)
  const total = list.reduce((a, g) => a + g.agg.n, 0)
  return list.map((g) => ({ ...g, share: total ? (g.agg.n / total) * 100 : 0, dyn: dynPct(g.agg) }))
}

export function byCategory(data: DemoData, sel: Sel, period: string) {
  const r = periodRange(period)!
  const m = new Map<CategoryCode, Agg>()
  for (const s of data.series) {
    if (!match(s, sel)) continue
    const c = catOfSeries(s)
    let a = m.get(c)
    if (!a) m.set(c, (a = emptyAgg()))
    addSeries(a, s, r)
  }
  const total = [...m.values()].reduce((a, x) => a + x.n, 0)
  return [...m.entries()].map(([code, agg]) => ({ code, agg, share: total ? (agg.n / total) * 100 : 0, dyn: dynPct(agg) })).sort((a, b) => b.agg.n - a.agg.n)
}
