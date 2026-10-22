import { useFilters, periodLabel } from '../state/filters'
import { useRegionStats } from '../data/hooks'
import { vedById } from '../config/reference'
import { METRICS } from '../config/thresholds'
import MapPanel from '../components/MapPanel'
import { Top10 } from '../components/Kpi'
import { Section, FilterChips, Breadcrumbs } from '../components/ui'
import { NationalRecs } from '../components/Recommendations'

export default function MapPage() {
  const { filters, qs } = useFilters()
  const stats = useRegionStats()
  const ved = filters.ved === 'all' ? null : vedById.get(filters.ved)!
  const metric = METRICS.find((m) => m.id === filters.metric)!
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs()}` }, { label: 'Карта регионов' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Карта регионов: {ved ? ved.name : 'все ведомства'}</h1>
          <p className="text-muted">{metric.name} · {periodLabel(filters.period)}</p>
        </div>
        <FilterChips />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Section title="Карта субъектов РФ"><MapPanel /></Section>
        <div className="grid gap-4 content-start">
          <Section title={`Топ-10: ${metric.short.toLowerCase()}`}><Top10 stats={stats} metric={filters.metric} /></Section>
          <NationalRecs compact />
        </div>
      </div>
    </div>
  )
}
