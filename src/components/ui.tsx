import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, X, ArrowLeft } from 'lucide-react'
import { METRICS } from '../config/thresholds'
import type { MetricId } from '../config/thresholds'
import { SCALE } from '../config/colors'
import { useFilters, periodLabel } from '../state/filters'
import { vedById, CATEGORIES } from '../config/reference'
import type { VedId } from '../config/reference'
import { topicName } from '../data/aggregate'

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Навигация" className="no-print flex flex-wrap items-center gap-1 text-sm text-muted mb-3">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} aria-hidden />}
          {it.to ? <Link to={it.to} className="hover:text-ink hover:underline">{it.label}</Link> : <span className="text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function BackToMap() {
  const { qs } = useFilters()
  return (
    <Link to={`/map${qs({ mode: 'min' })}`} className="btn-secondary no-print"><ArrowLeft size={16} aria-hidden />Вернуться к карте России</Link>
  )
}

export function Legend({ metric }: { metric: MetricId }) {
  const m = METRICS.find((x) => x.id === metric)!
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted" aria-label="Легенда карты">
      <span className="font-medium text-ink">{m.name}</span>
      {m.labels.map((l, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <i className="inline-block w-6 h-3 rounded-sm border border-black/10" style={{ background: SCALE[i] }} />
          <span>{i + 1}: {l}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><i className="inline-block w-6 h-3 rounded-sm hatch" />Оценка: регион не подключен к ФГИС УПЧ</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block w-6 h-3 rounded-sm bg-nodata" />Нет данных</span>
    </div>
  )
}

/** Метки активных фильтров с крестиком и сброс */
export function FilterChips() {
  const { filters, set } = useFilters()
  const chips: { label: string; clear: () => void }[] = []
  if (filters.ved !== 'all') chips.push({ label: `Ведомство: ${vedById.get(filters.ved)!.short}`, clear: () => set({ ved: 'all' }) })
  if (filters.topic && filters.ved !== 'all') chips.push({ label: `Тема: ${topicName(filters.ved, filters.topic)}`, clear: () => set({ topic: null }) })
  if (filters.cat) chips.push({ label: `Категория: ${CATEGORIES.find((c) => c.code === filters.cat)?.name}`, clear: () => set({ cat: null }) })
  if (filters.period !== '2026') chips.push({ label: `Период: ${periodLabel(filters.period)}`, clear: () => set({ period: '2026' }) })
  if (filters.status) chips.push({ label: `Статус: ${filters.status}`, clear: () => set({ status: null }) })
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2 no-print">
      {chips.map((c) => (
        <span key={c.label} className="chip">
          {c.label}
          <button onClick={c.clear} className="rounded-full p-0.5 hover:bg-bg" aria-label={`Убрать фильтр ${c.label}`}><X size={14} aria-hidden /></button>
        </span>
      ))}
      <button className="text-sm link" onClick={() => set({ ved: 'all', topic: null, cat: null, period: '2026', status: null })}>Сбросить все</button>
    </div>
  )
}

export function Delta({ value, unit = '%', goodWhenUp = false, neutral = false, pp = false }: { value: number | null; unit?: string; goodWhenUp?: boolean; neutral?: boolean; pp?: boolean }) {
  if (value === null || Number.isNaN(value)) return <span className="text-muted">н/д</span>
  const up = value > 0
  const good = goodWhenUp ? up : !up
  const color = neutral || Math.abs(value) < 0.05 ? 'text-muted' : good ? 'text-good' : 'text-bad'
  const s = `${up ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1).replace('.', ',')}${pp ? ' п.п.' : unit}`
  return <span className={color}>{s}</span>
}

export function Section({ title, aside, children, className = '' }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card card-pad grid gap-3 content-start min-w-0 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h-section">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

export function StatusBadge({ status }: { status: 'connected' | 'estimate' | 'nodata' }) {
  if (status === 'connected') return <span className="badge bg-good-soft text-good">Подключен к ФГИС УПЧ</span>
  if (status === 'estimate') return <span className="badge bg-est text-ink border border-est-line">Оценка: не подключен к ФГИС УПЧ</span>
  return <span className="badge bg-nodata text-white">Нет данных</span>
}

export function ClassPill({ cls, short }: { cls: number | null; short?: boolean }) {
  if (!cls) return <span className="text-muted text-xs">н/д</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap" title={`класс ${cls} из 5`}>
      <i className="inline-block w-3.5 h-3.5 rounded-sm border border-black/10" style={{ background: SCALE[cls - 1] }} />
      {short ? cls : `класс ${cls}`}
    </span>
  )
}

export const vedShort = (v: VedId) => vedById.get(v)!.short
