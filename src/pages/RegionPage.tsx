import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useStore } from '../data/store'
import { useFilters, periodLabel } from '../state/filters'
import { regionByNum, regionStatus, VEDS, vedById, CATEGORIES } from '../config/reference'
import type { VedId } from '../config/reference'
import { aggregate, avgDays, latePct, restoredPct, repeatPct, dynPct, per10k, popOf, POP_WITH_DATA, byTopic, byCategory, topicName } from '../data/aggregate'
import type { Agg } from '../data/aggregate'
import { useInstitutions } from '../data/hooks'
import { classOf } from '../config/thresholds'
import { fmtInt, fmtNum, fmtPct, fmtDays, fmtSignedPct, fmtDate } from '../lib/format'
import { Breadcrumbs, BackToMap, Section, StatusBadge, ClassPill, FilterChips } from '../components/ui'
import { BarList } from '../components/charts'
import { RegionRecs } from '../components/Recommendations'
import { LAST_REGION_KEY } from '../components/Layout'

type Cmp = { region: number | null; nat: number | null; worseWhenHigher: boolean; fmt: (v: number | null) => string }

function Compare({ c, noColor }: { c: Cmp; noColor?: boolean }) {
  if (c.region === null || c.nat === null) return <span className="text-xs text-muted">Россия: {c.fmt(c.nat)}</span>
  const worse = c.worseWhenHigher ? c.region > c.nat * 1.05 : c.region < c.nat * 0.95
  const better = c.worseWhenHigher ? c.region < c.nat * 0.95 : c.region > c.nat * 1.05
  const cls = noColor ? 'text-muted' : worse ? 'text-bad font-medium' : better ? 'text-good' : 'text-muted'
  return (
    <span className="text-xs">
      <span className="text-muted">Россия: {c.fmt(c.nat)}</span>{' '}
      {!noColor && (worse || better) && <span className={cls}>{worse ? '▲ хуже' : '▼ лучше'} среднего</span>}
    </span>
  )
}

function KpiCard({ to, label, value, sub, cmp, noColor }: { to?: string; label: string; value: string; sub?: ReactNode; cmp: Cmp; noColor?: boolean }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="kpi-num text-[30px]">{value}</span>
      {sub && <span className="text-xs">{sub}</span>}
      <Compare c={cmp} noColor={noColor} />
    </>
  )
  return to ? (
    <Link to={to} className="card p-4 grid gap-1 content-start hover:border-line2 hover:shadow-pop transition-shadow">{body}</Link>
  ) : (
    <div className="card p-4 grid gap-1 content-start">{body}</div>
  )
}

export default function RegionPage() {
  const { num } = useParams()
  const reg = regionByNum.get(Number(num))
  const { data, cases } = useStore()
  const { filters, set, qs } = useFilters()
  const nav = useNavigate()
  useEffect(() => { if (reg) try { localStorage.setItem(LAST_REGION_KEY, String(reg.num)) } catch { /* без хранилища */ } }, [reg])

  const iso = reg?.iso ?? ''
  const status = regionStatus(iso)
  const sel = useMemo(() => ({ ved: filters.ved, topic: filters.topic, cat: filters.cat }), [filters.ved, filters.topic, filters.cat])
  const a = useMemo(() => (reg ? aggregate(data, { ...sel, region: iso }, filters.period) : null), [data, sel, iso, reg, filters.period])
  const n = useMemo(() => aggregate(data, sel, filters.period), [data, sel, filters.period])
  const topics = useMemo(() => byTopic(data, { ...sel, region: iso }, filters.period), [data, sel, iso, filters.period])
  const cats = useMemo(() => byCategory(data, { ...sel, region: iso }, filters.period), [data, sel, iso, filters.period])
  const vedRows = useMemo(() => VEDS.map((v) => {
    const ra = aggregate(data, { ved: v.id, region: iso }, filters.period)
    return { v, a: ra, rate: per10k(ra.n, reg?.pop ?? 1) }
  }), [data, iso, filters.period, reg])
  const instVed = filters.ved === 'mvd' || filters.ved === 'fsin' ? filters.ved : null
  const insts = useInstitutions(instVed, iso)

  if (!reg) return <div className="card card-pad">Регион не найден. <Link className="link" to="/map">Вернуться к карте России</Link></div>

  const conn = status === 'connected'
  const ved = filters.ved === 'all' ? null : vedById.get(filters.ved)!
  const natRate = per10k(n.n, POP_WITH_DATA)
  const rate = per10k(a!.n, reg.pop)
  const ex = data.extras[iso]
  const caseQs = (extra: string) => { const q = qs(); return `/cases${q}${q ? '&' : '?'}region=${iso}${extra}` }
  const recent = cases.filter((c) => c.region === iso && (filters.ved === 'all' || c.ved === filters.ved)).slice(0, 6)
  const gov = filters.mode === 'gov'

  const vedTable = (
    <Section title="Ведомства в регионе" aside={<span className="text-xs text-muted">клик по строке переключает ведомство</span>}>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Ведомство</th><th className="text-right">Жалоб</th><th className="text-right">На 10 тыс.</th><th className="text-right">К прошлому году</th>
              <th className="text-right">Срок ответа</th><th className="text-right">Восстановлено</th><th>Класс: срок</th><th>Класс: восст.</th>
            </tr>
          </thead>
          <tbody>
            {vedRows.map(({ v, a: ra, rate: rr }) => {
              const d = avgDays(ra), rp = restoredPct(ra)
              const on = filters.ved === v.id
              return (
                <tr key={v.id} className={`cursor-pointer ${on ? 'bg-accent-soft' : ''}`} onClick={() => set({ ved: v.id })} tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && set({ ved: v.id })} aria-label={`Переключить на ${v.short}`}>
                  <td className="font-medium">{v.short}</td>
                  <td className="text-right num">{fmtInt(ra.n)}</td>
                  <td className="text-right num">{fmtNum(rr, 2)}</td>
                  <td className="text-right num">{fmtSignedPct(dynPct(ra))}</td>
                  <td className="text-right num">{conn ? fmtDays(d) : 'н/д'}</td>
                  <td className="text-right num">{conn ? fmtPct(rp) : 'н/д'}</td>
                  <td><ClassPill cls={conn && d !== null ? classOf('days', Math.round(d)) : null} short /></td>
                  <td><ClassPill cls={conn && rp !== null ? classOf('restored', rp) : null} short /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!conn && <p className="text-xs text-muted">Регион не подключен к ФГИС УПЧ: число жалоб является оценкой, сроки и доли не считаются.</p>}
    </Section>
  )

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs({ mode: 'min' })}` }, { label: 'Карта регионов', to: `/map${qs({ mode: 'min' })}` }, { label: reg.name }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <h1 className="page-title">{reg.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{reg.fd}</span><span>·</span><span>код субъекта {reg.num}</span><span>·</span>
            <StatusBadge status={status} />
            <span>·</span><span>{ved ? ved.name : 'Все ведомства'}</span><span>·</span><span>{periodLabel(filters.period)}</span>
            {gov && <span className="badge bg-accent-soft text-accent-ink">Режим «Губернатор»</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="sr-only" htmlFor="region-jump">Другой регион</label>
          <select id="region-jump" className="select" value={reg.num} onChange={(e) => nav(`/region/${e.target.value}${qs()}`)}>
            {[...regionByNum.values()].sort((x, y) => x.name.localeCompare(y.name, 'ru')).map((r) => <option key={r.num} value={r.num}>{r.name}</option>)}
          </select>
          <BackToMap />
        </div>
      </div>
      <FilterChips />

      {status === 'nodata' ? (
        <div className="card card-pad"><p className="font-medium">Нет данных</p><p className="text-sm text-muted">По региону нет данных в ФГИС УПЧ и в докладе. Отсутствие данных не приравнивается к хорошему результату.</p></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard to={caseQs('')} label={`Жалоб в сфере ${ved ? ved.short : 'ведомств'}${conn ? '' : ' (оценка)'}`} value={fmtInt(a!.n)}
              sub={<span className="text-muted">{fmtNum(rate, 2)} на 10 тыс. жителей · {fmtSignedPct(dynPct(a!))} к прошлому году</span>}
              cmp={{ region: rate, nat: natRate, worseWhenHigher: true, fmt: (v) => `${fmtNum(v, 2)} на 10 тыс.` }} noColor />
            <KpiCard to={conn ? caseQs('&folder=overdue') : undefined} label="Срок ответа ведомства" value={conn ? fmtDays(avgDays(a!)) : 'не считается'}
              sub={conn ? <span className="text-muted">{fmtPct(latePct(a!))} ответов с нарушением срока</span> : undefined}
              cmp={{ region: conn ? avgDays(a!) : null, nat: avgDays(n), worseWhenHigher: true, fmt: fmtDays }} />
            <KpiCard to={conn ? caseQs('&folder=restored') : undefined} label="Восстановленные права" value={conn ? fmtPct(restoredPct(a!)) : 'не считается'}
              sub={conn ? <span className="text-muted">{fmtInt(a!.rest)} подтвержденных случаев из {fmtInt(a!.viol)}</span> : undefined}
              cmp={{ region: conn ? restoredPct(a!) : null, nat: restoredPct(n), worseWhenHigher: false, fmt: (v) => fmtPct(v) }} />
            <KpiCard to={conn ? caseQs('&folder=repeat') : undefined} label="Повторные обращения" value={conn ? fmtPct(repeatPct(a!)) : 'не считается'}
              sub={conn ? <span className="text-muted">{fmtInt(a!.rep)} повторных</span> : undefined}
              cmp={{ region: conn ? repeatPct(a!) : null, nat: repeatPct(n), worseWhenHigher: true, fmt: (v) => fmtPct(v) }} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-4 content-start min-w-0">
              {(gov || !ved) && vedTable}
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title={ved ? `Темы: ${ved.short}` : 'По ведомствам'}>
                  <BarList rows={topics.map((t) => ({ key: t.key, name: t.name, n: t.agg.n, share: t.share, dyn: t.dyn, to: ved ? `/cases${qs({ topic: t.topic })}${qs({ topic: t.topic }) ? '&' : '?'}region=${iso}` : undefined }))} />
                </Section>
                <Section title="Категории прав">
                  <BarList rows={cats.map((c) => ({ key: c.code, name: `${c.code} ${CATEGORIES.find((x) => x.code === c.code)!.name}`, n: c.agg.n, share: c.share, dyn: c.dyn, to: `/cases${qs({ cat: c.code })}${qs({ cat: c.code }) ? '&' : '?'}region=${iso}` }))} />
                </Section>
              </div>
              {ved && conn && <VedBlock ved={ved.id} iso={iso} agg={a!} insts={insts} />}
              {!gov && ved && vedTable}
              {conn && ex && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <Section title="Проблемные муниципалитеты">
                    <ul className="grid gap-2">
                      {[...ex.munis].sort((x, y) => y.growth - x.growth).map((m) => {
                        const [v, t] = m.topic.split(':') as [VedId, string]
                        return (
                          <li key={m.name} className="flex justify-between gap-3 text-sm border-b border-line last:border-0 pb-2">
                            <span><b className="font-medium">{m.name}</b><br /><span className="text-xs text-muted">основная тема: {topicName(v, t)} ({vedById.get(v)!.short})</span></span>
                            <span className="num text-right whitespace-nowrap">{fmtInt(a!.n * m.share)}<br /><span className="text-xs text-muted">{fmtSignedPct(m.growth, 0)}</span></span>
                          </li>
                        )
                      })}
                    </ul>
                  </Section>
                  <Section title="Последние обращения" aside={<Link className="text-sm link" to={caseQs('')}>Все обращения региона</Link>}>
                    <ul className="grid gap-2">
                      {recent.map((c) => (
                        <li key={c.id} className="text-sm border-b border-line last:border-0 pb-2">
                          <Link className="link num" to={`/case/${c.id}${qs()}`}>{c.id}</Link> <span className="text-xs text-muted">{fmtDate(c.received)} · {c.status}</span>
                          <p className="text-muted text-xs">{vedById.get(c.ved)!.short}: {topicName(c.ved, c.topic)}</p>
                        </li>
                      ))}
                      {!recent.length && <li className="text-sm text-muted">Нет обращений за период</li>}
                    </ul>
                  </Section>
                </div>
              )}
            </div>
            <RegionRecs iso={iso} />
          </div>
        </>
      )}
    </div>
  )
}

function VedBlock({ ved, iso, agg, insts }: { ved: VedId; iso: string; agg: Agg; insts: ReturnType<typeof useInstitutions> }) {
  const { data } = useStore()
  const { filters } = useFilters()
  const ex = data.extras[iso]
  const v = vedById.get(ved)!
  if (ved === 'prok') {
    const cl = ex.prok.clusters
    const share = (agg.n / Math.max(1, aggregate(data, { ved: 'prok', region: iso }, '2026').n))
    return (
      <Section title="Прокуратура: повторяющиеся нарушения">
        <div className="grid grid-cols-3 gap-3">
          <div><p className="label">Повторов (5+ за квартал)</p><p className="num text-xl font-semibold">{cl.length}</p></div>
          <div><p className="label">Отменено незаконных решений</p><p className="num text-xl font-semibold">{fmtInt(ex.prok.cancelled * Math.min(1, share))}</p></div>
          <div><p className="label">Привлечено должностных лиц</p><p className="num text-xl font-semibold">{fmtInt(ex.prok.officials * Math.min(1, share))}</p></div>
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Квартал</th><th>Орган</th><th>Тема</th><th className="text-right">Жалоб</th></tr></thead>
            <tbody>
              {[...cl].sort((a, b) => b.q.localeCompare(a.q)).slice(0, 6).map((c, i) => (
                <tr key={i}><td className="num">{c.q.slice(0, 4)} Q{Math.floor((+c.q.slice(5) - 1) / 3) + 1}</td><td>{c.organ}</td><td>{topicName('prok', c.topic)}</td><td className="text-right num">{c.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    )
  }
  if (ved === 'mvd' || ved === 'fsin') {
    return (
      <Section title={`${v.short}: учреждения с 5 и более жалобами`} aside={<span className="text-xs text-muted">{periodLabel(filters.period)}</span>}>
        {!insts.length && <p className="text-sm text-muted">Учреждений с 5 и более жалобами за период нет. Учреждения с меньшим числом жалоб не показываются, чтобы не выдать заявителя.</p>}
        <ul className="grid gap-3">
          {insts.map((i) => (
            <li key={i.id} className="border-b border-line last:border-0 pb-3 grid gap-1">
              <div className="flex justify-between gap-3"><b className="font-medium">{i.name}</b><span className="num">{i.n} жалоб{i.ved === 'fsin' ? ` · ${fmtNum((i.n / i.cap) * 1000, 1)} на 1 тыс.` : ''}</span></div>
              <p className="text-xs text-muted">Темы: {v.topics.map((t, k) => (i.topics[k] ? `${t.name} (${i.topics[k]})` : null)).filter(Boolean).join(', ')}</p>
              {i.visits.length > 0 && <p className="text-xs">Выезды: {i.visits.map((x) => `${fmtDate(x.date)}, ${x.by}: ${x.result}`).join('; ')}</p>}
            </li>
          ))}
        </ul>
      </Section>
    )
  }
  if (ved === 'trud') {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Категории заявителей">
          <BarList rows={Object.entries(ex.trud.applicants).map(([k, s]) => ({ key: k, name: k, n: Math.round(agg.n * s), share: s * 100, dyn: null }))} />
        </Section>
        <Section title="Отделения СФР с наибольшим числом жалоб">
          <ul className="grid gap-2">
            {(() => { const tot = ex.trud.sfr.reduce((s, x) => s + x.share, 0); return ex.trud.sfr.map((s) => (
              <li key={s.name} className="flex justify-between gap-3 text-sm border-b border-line last:border-0 pb-2"><span>{s.name}</span><span className="num">{fmtInt((agg.n * s.share) / tot)}</span></li>
            )) })()}
          </ul>
        </Section>
      </div>
    )
  }
  // Минобороны: распределение по темам показано выше; здесь доля по каждой теме в регионе к России
  const reg = byTopic(data, { ved: 'mo', region: iso }, filters.period)
  const nat = byTopic(data, { ved: 'mo' }, filters.period)
  return (
    <Section title="Минобороны: темы в регионе и в России">
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Тема</th><th className="text-right">Жалоб</th><th className="text-right">На 10 тыс.</th><th className="text-right">Россия, на 10 тыс.</th><th className="text-right">К прошлому году</th></tr></thead>
          <tbody>
            {reg.map((t) => {
              const nt = nat.find((x) => x.key === t.key)
              return (
                <tr key={t.key}><td>{t.name}</td><td className="text-right num">{fmtInt(t.agg.n)}</td><td className="text-right num">{fmtNum(per10k(t.agg.n, popOf(iso)), 2)}</td><td className="text-right num">{fmtNum(per10k(nt?.agg.n ?? 0, POP_WITH_DATA), 2)}</td><td className="text-right num">{fmtSignedPct(t.dyn)}</td></tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
