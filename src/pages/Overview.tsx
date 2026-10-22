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
      <section className="relative overflow-hidden rounded-xl bg-side text-white px-6 sm:px-9 py-7 sm:py-8">
        <div aria-hidden className="blob absolute -right-24 -top-28 w-[420px] h-[420px] bg-[radial-gradient(circle_at_30%_30%,#E0656D,#A3242F_45%,#5A1019_80%)] opacity-90 blur-[2px]" />
        <div aria-hidden className="blob absolute right-40 top-24 w-[180px] h-[180px] bg-[radial-gradient(circle_at_40%_40%,#F3A6A0,#C2414B_60%)] opacity-60 blur-xl [animation-delay:-6s]" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#1C181B_35%,rgba(28,24,27,.55)_70%,rgba(28,24,27,0))]" />
        <div className="relative grid gap-3 max-w-[720px]">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F3A6A0]">Обзор по России · {periodLabel(filters.period)}</span>
          <h1 className="font-display text-[28px] sm:text-[40px] leading-[1.04] font-medium tracking-[-0.03em]">{ved ? ved.name : 'Все ведомства'}</h1>
          <p className="text-[16px] text-white/75 max-w-[60ch]">{ved ? `Слой «${ved.layer}»: где в сфере ведомства нарушаются права граждан, как это меняется и что уже сделано.` : 'Обращения, которые Уполномоченный направляет в пять ведомств: где нарушаются права, как это меняется и что уже сделано.'}</p>
        </div>
      </section>
      <FilterChips />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
