import { useMemo } from 'react'
import { useStore } from '../data/store'
import { useFilters, periodLabel } from '../state/filters'
import { VEDS, VEDS_LATER } from '../config/reference'
import { aggregate, avgDays, dynPct, latePct, per10k, POP_WITH_DATA, restoredPct, repeatPct } from '../data/aggregate'
import { useRegionStats } from '../data/hooks'
import { fmtDays, fmtInt, fmtNum, fmtPct, fmtSignedPct } from '../lib/format'
import { Breadcrumbs, Section, FilterChips } from '../components/ui'
import { NationalRecs } from '../components/Recommendations'
import { Top10 } from '../components/Kpi'
import { ReportVolumes } from './Overview'
import { METRICS } from '../config/thresholds'

export default function VedsPage() {
  const { data } = useStore()
  const { filters, set, qs } = useFilters()
  const rows = useMemo(() => VEDS.map((v) => ({ v, a: aggregate(data, { ved: v.id }, filters.period) })), [data, filters.period])
  const stats = useRegionStats()
  const metric = METRICS.find((m) => m.id === filters.metric)!
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs()}` }, { label: 'Ведомства' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Ведомства</h1>
          <p className="text-muted">Сфера каждого ведомства по всей России · {periodLabel(filters.period)}</p>
        </div>
        <FilterChips />
      </div>
      <Section title="Пять ведомств первой версии" aside={<span className="text-xs text-muted">клик по строке выбирает ведомство</span>}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Ведомство</th><th>Слой на карте</th><th className="text-right">Жалоб</th><th className="text-right">На 10 тыс.</th><th className="text-right">К прошлому году</th><th className="text-right">Срок ответа</th><th className="text-right">С нарушением срока</th><th className="text-right">Восстановлено</th><th className="text-right">Повторные</th></tr></thead>
            <tbody>
              {rows.map(({ v, a }) => (
                <tr key={v.id} tabIndex={0} className={`cursor-pointer ${filters.ved === v.id ? 'bg-accent-soft' : ''}`} onClick={() => set({ ved: v.id })} onKeyDown={(e) => e.key === 'Enter' && set({ ved: v.id })}>
                  <td className="font-medium">{v.name}</td><td className="text-muted">{v.layer}</td>
                  <td className="text-right num">{fmtInt(a.n)}</td><td className="text-right num">{fmtNum(per10k(a.n, POP_WITH_DATA), 2)}</td>
                  <td className="text-right num">{fmtSignedPct(dynPct(a))}</td><td className="text-right num">{fmtDays(avgDays(a))}</td>
                  <td className="text-right num">{fmtPct(latePct(a))}</td><td className="text-right num">{fmtPct(restoredPct(a))}</td><td className="text-right num">{fmtPct(repeatPct(a))}</td>
                </tr>
              ))}
              {VEDS_LATER.map((n) => (
                <tr key={n} className="text-muted"><td>{n}</td><td colSpan={8}>Подключается позже</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4 content-start min-w-0">
          <Section title={`Топ-10 регионов: ${metric.short.toLowerCase()}`}><Top10 stats={stats} metric={filters.metric} /></Section>
          <Section title="Объемы по ведомствам по данным доклада"><ReportVolumes /></Section>
        </div>
        <NationalRecs />
      </div>
    </div>
  )
}
