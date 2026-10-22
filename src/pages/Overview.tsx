import { useMemo } from 'react'
import { useStore } from '../data/store'
import { useFilters, periodLabel } from '../state/filters'
import { useRegionStats, useSel } from '../data/hooks'
import { monthly, byTopic, byCategory } from '../data/aggregate'
import { vedById, CATEGORIES, REPORT_SOURCE, VEDS } from '../config/reference'
import { METRICS } from '../config/thresholds'
import MapPanel from '../components/MapPanel'
import { KpiColumn, Top10 } from '../components/Kpi'
import { MonthlyChart, BarList } from '../components/charts'
import { FilterChips, Section } from '../components/ui'
import { fmtInt } from '../lib/format'

export function ReportVolumes() {
  const { data } = useStore()
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr><th>Ведомство</th><th className="text-right">2023</th><th className="text-right">2024</th><th className="text-right">2025</th></tr></thead>
        <tbody>
          {VEDS.map((v) => (
            <tr key={v.id}>
              <td>{v.short}</td>
              {[2023, 2024, 2025].map((y) => {
                const real = data.meta.totalsReal[v.id].includes(y)
                return <td key={y} className={`text-right num ${real ? 'font-semibold' : 'text-muted'}`}>{fmtInt(data.meta.totals[v.id][y])}{real ? '' : '*'}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted mt-2">Жирным: данные доклада ({REPORT_SOURCE}). Со звездочкой: демонстрационные значения. Для Минтруда в докладе 140 обращений, остальное: демонстрационные обращения в отделения СФР.</p>
    </div>
  )
}

export default function Overview() {
  const { data } = useStore()
  const { filters, qs } = useFilters()
  const sel = useSel()
  const stats = useRegionStats()
  const months = useMemo(() => monthly(data, sel, filters.period), [data, sel, filters.period])
  const topics = useMemo(() => byTopic(data, sel, filters.period), [data, sel, filters.period])
  const cats = useMemo(() => byCategory(data, sel, filters.period), [data, sel, filters.period])
  const ved = filters.ved === 'all' ? null : vedById.get(filters.ved)!
  const metric = METRICS.find((m) => m.id === filters.metric)!

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Обзор по России: {ved ? ved.name : 'все ведомства'}</h1>
          <p className="text-muted">{ved ? `Слой «${ved.layer}»` : 'Обращения, направленные Уполномоченным в пять ведомств'} · {periodLabel(filters.period)}</p>
        </div>
        <FilterChips />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 content-start min-w-0">
          <Section title={`Карта регионов${ved ? `: ${ved.short}` : ''}`}>
            <MapPanel />
          </Section>
          <Section title="Обращения по месяцам" aside={<span className="text-xs text-muted">с линией прошлого года</span>}>
            <MonthlyChart rows={months} />
          </Section>
        </div>
        <div className="grid gap-4 content-start">
          <KpiColumn />
          <Section title={`Топ-10 регионов: ${metric.short.toLowerCase()}`} aside={<span className="text-xs text-muted">от требующих внимания</span>}>
            <Top10 stats={stats} metric={filters.metric} />
          </Section>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        <Section title={ved ? `Темы: ${ved.short}` : 'Распределение по ведомствам'} aside={<span className="text-xs text-muted">количество · доля · к прошлому году</span>}>
          <BarList
            rows={topics.map((t) => ({
              key: t.key, name: t.name, n: t.agg.n, share: t.share, dyn: t.dyn,
              to: ved ? `/cases${qs({ topic: t.topic })}` : `/${qs({ ved: t.ved })}`,
            }))}
          />
        </Section>
        <Section title="Категории прав" aside={<span className="text-xs text-muted">классификация команды, коды 01-07</span>}>
          <BarList
            rows={cats.map((c) => ({
              key: c.code, name: `${c.code} ${CATEGORIES.find((x) => x.code === c.code)!.name}`, n: c.agg.n, share: c.share, dyn: c.dyn,
              to: `/cases${qs({ cat: c.code })}`,
            }))}
          />
        </Section>
        <Section title="Объемы по ведомствам по данным доклада">
          <ReportVolumes />
        </Section>
      </div>
    </div>
  )
}
