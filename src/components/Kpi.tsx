import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { CONNECTED, TOTAL_REGIONS } from '../config/reference'
import { useFilters } from '../state/filters'
import { useNational } from '../data/hooks'
import { avgDays, latePct, restoredPct, repeatPct, dynPct } from '../data/aggregate'
import type { RegionStat } from '../data/aggregate'
import { METRICS, classOf } from '../config/thresholds'
import type { MetricId } from '../config/thresholds'
import { regionByIso } from '../config/reference'
import { fmtInt, fmtNum, fmtPct, fmtDays, fmtSignedPct, fmtRatio } from '../lib/format'
import { Delta, ClassPill } from './ui'

function KpiRow({ to, label, value, sub, children }: { to: string; label: string; value: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <Link to={to} className="group grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-5 py-4 border-b border-line last:border-b-0 hover:bg-bg/70 transition-colors">
      <span className="text-sm text-muted">{label}</span>
      <span className="row-span-2 self-center flex items-center gap-1">
        <span className="kpi-num text-[24px]">{value}</span>
        <ChevronRight size={16} className="text-line2 group-hover:text-muted" aria-hidden />
      </span>
      <span className="text-xs">{sub}</span>
      {children}
    </Link>
  )
}

/** Пять ключевых показателей по России для выбранного ведомства */
export function KpiColumn() {
  const { qs } = useFilters()
  const { agg, rate } = useNational()
  const restoredPrev = null
  return (
    <section className="card overflow-hidden" aria-label="Ключевые показатели">
      <KpiRow to={`/cases${qs()}`} label="Жалоб в сфере ведомства" value={fmtInt(agg.n)}
        sub={<><Delta value={dynPct(agg)} neutral /> <span className="text-muted">к прошлому году · {fmtNum(rate, 2)} на 10 тыс. жителей</span></>} />
      <KpiRow to={`/cases${qs()}${qs().includes('?') ? '&' : '?'}folder=overdue`} label="Средний срок ответа ведомства" value={fmtDays(avgDays(agg))}
        sub={<span className="text-bad">{fmtPct(latePct(agg))} ответов с нарушением срока</span>} />
      <KpiRow to={`/cases${qs()}${qs().includes('?') ? '&' : '?'}folder=restored`} label="Доля восстановленных прав" value={fmtPct(restoredPct(agg))}
        sub={<span className="text-muted">{fmtInt(agg.rest)} из {fmtInt(agg.viol)} завершенных с установленным нарушением{restoredPrev}</span>} />
      <KpiRow to={`/cases${qs()}${qs().includes('?') ? '&' : '?'}folder=repeat`} label="Доля повторных обращений" value={fmtPct(repeatPct(agg))}
        sub={<span className="text-muted">признак формальных ответов</span>} />
      <KpiRow to={`/map${qs()}`} label="Охват регионов системой" value={`${CONNECTED.size} из ${TOTAL_REGIONS}`}
        sub={<span className="text-muted">{TOTAL_REGIONS - CONNECTED.size} в режиме «Оценка» или без данных</span>} />
      <p className="px-5 py-3 text-xs text-muted bg-bg/60">Сроки, доли восстановленных и повторных считаются по {CONNECTED.size} подключенным регионам.</p>
    </section>
  )
}

const fmtMetric = (m: MetricId, v: number | null) =>
  m === 'rate' ? fmtRatio(v) : m === 'dyn' ? fmtSignedPct(v) : m === 'days' ? fmtDays(v) : fmtPct(v)

export function rankRegions(stats: Map<string, RegionStat>, metric: MetricId, limit = 10) {
  const def = METRICS.find((x) => x.id === metric)!
  const list = [...stats.values()].filter((s) => {
    if (s.values[metric] === null) return false
    if (metric === 'dyn') return s.agg.prev >= 20
    if (metric === 'rate') return s.agg.n >= 5
    return s.agg.nc >= 5
  })
  list.sort((a, b) => (def.inverse ? a.values[metric]! - b.values[metric]! : b.values[metric]! - a.values[metric]!))
  return list.slice(0, limit)
}

export function Top10({ stats, metric }: { stats: Map<string, RegionStat>; metric: MetricId }) {
  const { qs } = useFilters()
  const list = rankRegions(stats, metric)
  return (
    <ol className="grid">
      {list.map((s, i) => {
        const reg = regionByIso.get(s.iso)!
        const v = s.values[metric]
        const cls = classOf(metric, metric === 'days' ? Math.round(v!) : v!)
        return (
          <li key={s.iso}>
            <Link to={`/region/${reg.num}${qs()}`} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 py-2 border-b border-line last:border-0 hover:bg-bg rounded px-1 -mx-1">
              <span className="num text-xs text-muted">{i + 1}</span>
              <span className="text-sm min-w-0">
                {reg.name}
                {s.status === 'estimate' && <span className="ml-1.5 text-xs text-muted">(оценка)</span>}
              </span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span className="num text-sm font-medium">{fmtMetric(metric, v)}</span>
                <ClassPill cls={cls} />
              </span>
            </Link>
          </li>
        )
      })}
      {!list.length && <li className="text-sm text-muted">Недостаточно данных для рейтинга</li>}
    </ol>
  )
}

export { fmtMetric }
