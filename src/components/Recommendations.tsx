import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { useStore } from '../data/store'
import { useFilters } from '../state/filters'
import { regionRecs, nationalRecs, LEVEL_LABEL } from '../logic/recommendations'
import type { Rec } from '../logic/recommendations'

const STYLE = {
  high: { box: 'border-l-bad', badge: 'bg-bad-soft text-bad', Icon: AlertTriangle },
  medium: { box: 'border-l-warn', badge: 'bg-warn-soft text-warn', Icon: AlertCircle },
  info: { box: 'border-l-info', badge: 'bg-info-soft text-info', Icon: Info },
}

export function RecList({ recs, compact = false, limit }: { recs: Rec[]; compact?: boolean; limit?: number }) {
  const { qs } = useFilters()
  const list = limit ? recs.slice(0, limit) : recs
  if (!list.length) return <p className="text-sm text-muted">По фиксированным порогам отклонений, требующих внимания, не выявлено.</p>
  return (
    <ul className="grid gap-2.5">
      {list.map((r) => {
        const s = STYLE[r.level]
        return (
          <li key={r.id} className={`rounded border border-line border-l-4 ${s.box} bg-surface p-3 grid gap-1.5`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${s.badge}`}><s.Icon size={13} className="mr-1" aria-hidden />{LEVEL_LABEL[r.level]}</span>
              <span className="text-xs text-muted">Адресат: <b className="text-ink font-medium">{r.addressee}</b></span>
            </div>
            <p className="font-semibold leading-snug">{r.title}</p>
            <p className="text-sm num">{r.indicator}</p>
            {!compact && <p className="text-sm text-muted">{r.why}</p>}
            <p className="text-sm">{r.action}</p>
            {!compact && r.ved && (
              <Link className="text-sm link justify-self-start no-print" to={`/cases${qs({ ved: r.ved, topic: r.topic ?? null })}`}>Открыть обращения</Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function RecsBox({ recs, title = 'Приоритетные проблемы и рекомендации', compact, limit }: { recs: Rec[]; title?: string; compact?: boolean; limit?: number }) {
  return (
    <section className="card card-pad grid gap-3 content-start border-t-4 border-t-accent">
      <div className="grid gap-0.5">
        <h2 className="h-section">{title}</h2>
        <p className="text-xs text-muted">Формируются автоматически по фиксированным порогам. Это основание для дополнительной проверки и анализа, а не вывод о нарушении прав.</p>
      </div>
      <RecList recs={recs} compact={compact} limit={limit} />
    </section>
  )
}

export function RegionRecs({ iso }: { iso: string }) {
  const { data, institutions } = useStore()
  const { filters } = useFilters()
  const recs = useMemo(() => regionRecs(data, institutions, iso, filters.period, filters.ved), [data, institutions, iso, filters.period, filters.ved])
  return <RecsBox recs={recs} />
}

export function NationalRecs({ compact }: { compact?: boolean }) {
  const { data } = useStore()
  const { filters } = useFilters()
  const recs = useMemo(() => nationalRecs(data, filters.period, filters.ved, filters.topic), [data, filters.period, filters.ved, filters.topic])
  return <RecsBox recs={recs} compact={compact} limit={compact ? 4 : undefined} />
}
