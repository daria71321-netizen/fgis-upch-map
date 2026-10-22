import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import RussiaMap from './RussiaMap'
import type { MapRegionView } from './RussiaMap'
import { Legend } from './ui'
import { useFilters } from '../state/filters'
import { useRegionStats, useInstitutions } from '../data/hooks'
import { regionByIso, vedById, VEDS, CATEGORIES, REGIONS } from '../config/reference'
import type { CategoryCode } from '../config/reference'
import { METRICS } from '../config/thresholds'
import type { MetricId } from '../config/thresholds'
import { fmtInt, fmtNum, fmtSignedPct, fmtDays, fmtPct } from '../lib/format'
import { avgDays, restoredPct, latePct } from '../data/aggregate'

const STATUS_NOTE = {
  estimate: 'Оценка, регион не подключен к ФГИС УПЧ',
  nodata: 'Нет данных',
}

export default function MapPanel({ height }: { height?: number }) {
  const { filters, set, qs, sp } = useFilters()
  const hl = sp.get('hl')
  const nav = useNavigate()
  const stats = useRegionStats()
  const instVed = filters.ved === 'mvd' || filters.ved === 'fsin' ? filters.ved : null
  const insts = useInstitutions(instVed)
  const metric = METRICS.find((m) => m.id === filters.metric)!

  const view = useMemo(() => {
    const m = new Map<string, MapRegionView>()
    for (const [iso, s] of stats) m.set(iso, { status: s.status, cls: s.cls[filters.metric] })
    return m
  }, [stats, filters.metric])

  const points = filters.inst && instVed
    ? insts.map((i) => ({ id: i.id, lon: i.lon, lat: i.lat, r: 3 + Math.sqrt(i.n) * 1.1, label: `${i.name}: ${i.n} жалоб` }))
    : []

  const open = (iso: string) => {
    const q = new URLSearchParams(qs().slice(1)); q.delete('hl')
    const s = q.toString()
    nav(`/region/${regionByIso.get(iso)!.num}${s ? `?${s}` : ''}`)
  }

  const tooltip = (iso: string) => {
    const s = stats.get(iso)!
    const reg = regionByIso.get(iso)!
    const vedName = filters.ved === 'all' ? 'всех ведомств' : vedById.get(filters.ved)!.short
    if (s.status === 'nodata')
      return (<div className="grid gap-1"><b>{reg.name}</b><span className="text-muted">Нет данных. Отсутствие данных не означает хороший результат.</span></div>)
    const cls = s.cls[filters.metric]
    return (
      <div className="grid gap-1">
        <b className="text-[15px]">{reg.name}</b>
        {s.status === 'estimate' && <span className="badge bg-est border border-est-line justify-self-start">{STATUS_NOTE.estimate}</span>}
        <span>Жалоб в сфере {vedName}: <b className="num">{fmtInt(s.agg.n)}</b></span>
        <span>На 10 тыс. жителей: <b className="num">{fmtNum(s.rate, 2)}</b> ({fmtNum(s.ratio, 2)}× к России)</span>
        <span>Динамика к прошлому году: <b className="num">{fmtSignedPct(s.values.dyn)}</b></span>
        {s.status === 'connected' ? (
          <>
            <span>Срок ответа ведомства: <b className="num">{fmtDays(avgDays(s.agg))}</b>, с нарушением срока {fmtPct(latePct(s.agg))}</span>
            <span>Восстановлено прав: <b className="num">{fmtPct(restoredPct(s.agg))}</b></span>
          </>
        ) : (
          <span className="text-muted">Срок ответа и доля восстановленных прав не считаются</span>
        )}
        {s.status === 'connected' || filters.metric === 'rate' || filters.metric === 'dyn' ? (
          cls ? <span className="text-xs text-muted">{metric.short}: класс {cls} из 5 ({metric.labels[cls - 1]})</span> : null
        ) : null}
        <span className="text-xs text-accent-ink">Нажмите, чтобы открыть страницу региона</span>
      </div>
    )
  }
  const pointTooltip = (id: string) => {
    const i = insts.find((x) => x.id === id)!
    const v = vedById.get(i.ved)!
    const per1000 = i.ved === 'fsin' ? (i.n / i.cap) * 1000 : null
    return (
      <div className="grid gap-1">
        <b>{i.name}</b>
        <span className="text-muted">{regionByIso.get(i.r)!.name}</span>
        <span>Жалоб за период: <b className="num">{fmtInt(i.n)}</b>{per1000 !== null && <> ({fmtNum(per1000, 1)} на 1 тыс. содержащихся)</>}</span>
        <span>Темы: {v.topics.map((t, k) => (i.topics[k] ? `${t.name} ${i.topics[k]}` : null)).filter(Boolean).join(', ')}</span>
      </div>
    )
  }

  const vedObj = filters.ved !== 'all' ? vedById.get(filters.ved)! : null
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2 items-end">
        <label className="grid gap-1 min-w-0 max-w-full">
          <span className="label">Тема</span>
          <select id="map-topic" className="select" disabled={!vedObj} value={filters.topic ?? ''} onChange={(e) => set({ topic: e.target.value || null })}>
            <option value="">{vedObj ? 'Все темы ведомства' : 'Выберите ведомство'}</option>
            {vedObj?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 min-w-0 max-w-full">
          <span className="label">Показатель</span>
          <select id="map-metric" className="select" value={filters.metric} onChange={(e) => set({ metric: e.target.value as MetricId })}>
            {METRICS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 min-w-0 max-w-full">
          <span className="label">Категория прав</span>
          <select id="map-cat" className="select max-w-[220px]" value={filters.cat ?? ''} onChange={(e) => set({ cat: (e.target.value || null) as CategoryCode | null })}>
            <option value="">Все категории</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 min-w-0 max-w-full">
          <span className="label">Найти регион</span>
          <select id="map-region" className="select max-w-[220px]" value="" onChange={(e) => e.target.value && open(e.target.value)}>
            <option value="">Выберите субъект</option>
            {[...REGIONS].sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((r) => <option key={r.iso} value={r.iso}>{r.name}</option>)}
          </select>
        </label>
        <label className={`flex items-center gap-2 text-sm pb-2 ${instVed ? '' : 'opacity-50'}`} title={instVed ? '' : 'Доступно для МВД и ФСИН'}>
          <input id="map-inst" type="checkbox" className="w-4 h-4 accent-[#A3242F]" disabled={!instVed} checked={filters.inst && !!instVed} onChange={(e) => set({ inst: e.target.checked })} />
          Показать учреждения{instVed ? ` (${instVed === 'fsin' ? 'колонии и СИЗО' : 'ИВС и ЦВСИГ'})` : ''}
        </label>
      </div>
      <div className="rounded border border-line bg-[#FBFAFA] overflow-hidden">
        <RussiaMap view={view} onSelect={open} tooltip={tooltip} pointTooltip={pointTooltip} points={points} height={height} highlight={hl} />
      </div>
      <Legend metric={filters.metric} />
      {filters.inst && instVed && (
        <p className="text-xs text-muted">Точки: учреждения с 5 и более жалобами за период (чтобы точка не выдавала заявителя), размер по числу жалоб. Показано {insts.length}.</p>
      )}
      <p className="text-xs text-muted max-w-[90ch]">
        Большое число обращений не означает плохую работу региона: оно связано с численностью населения и доступностью института Уполномоченного. Поэтому показатель считается на 10 тыс. жителей. Пороги классов фиксированные и одинаковые для всех ведомств.
      </p>
      {VEDS.length === 0 && null}
    </div>
  )
}
