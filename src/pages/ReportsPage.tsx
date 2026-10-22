import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { useStore } from '../data/store'
import { useFilters, periodLabel, PERIOD_OPTIONS } from '../state/filters'
import { VEDS, vedById, REGIONS, regionByNum, regionStatus, DATA_DATE } from '../config/reference'
import type { VedId } from '../config/reference'
import { aggregate, avgDays, dynPct, latePct, per10k, POP_WITH_DATA, restoredPct, repeatPct, regionStats } from '../data/aggregate'
import type { Agg } from '../data/aggregate'
import { regionRecs, nationalRecs, LEVEL_LABEL } from '../logic/recommendations'
import { rankRegions } from '../components/Kpi'
import { METRICS, INSTITUTION_MIN } from '../config/thresholds'
import type { MetricId } from '../config/thresholds'
import { periodRange } from '../state/filters'
import { fmtDate, fmtDays, fmtInt, fmtNum, fmtPct, fmtSignedPct } from '../lib/format'
import { downloadCsv, csvNum } from '../lib/csv'
import { Breadcrumbs } from '../components/ui'
import { RecList } from '../components/Recommendations'

type Ind = 'n' | 'rate' | 'dyn' | 'days' | 'late' | 'restored' | 'repeat'
const INDS: { id: Ind; name: string; val: (a: Agg, pop: number) => number | null; fmt: (v: number | null) => string; csv: (v: number | null) => string }[] = [
  { id: 'n', name: 'Жалоб', val: (a) => a.n, fmt: fmtInt, csv: (v) => (v === null ? '' : String(Math.round(v))) },
  { id: 'rate', name: 'На 10 тыс. жителей', val: (a, p) => per10k(a.n, p), fmt: (v) => fmtNum(v, 2), csv: (v) => csvNum(v, 2) },
  { id: 'dyn', name: 'К прошлому году, %', val: dynPct, fmt: fmtSignedPct, csv: (v) => csvNum(v) },
  { id: 'days', name: 'Срок ответа, дн.', val: avgDays, fmt: fmtDays, csv: (v) => csvNum(v, 0) },
  { id: 'late', name: 'С нарушением срока, %', val: latePct, fmt: (v) => fmtPct(v), csv: (v) => csvNum(v) },
  { id: 'restored', name: 'Восстановлено прав, %', val: restoredPct, fmt: (v) => fmtPct(v), csv: (v) => csvNum(v) },
  { id: 'repeat', name: 'Повторные, %', val: repeatPct, fmt: (v) => fmtPct(v), csv: (v) => csvNum(v) },
]

export default function ReportsPage() {
  const { data, institutions } = useStore()
  const { filters, qs } = useFilters()
  const [tpl, setTpl] = useState<'ved' | 'gov'>(filters.mode === 'gov' ? 'gov' : 'ved')
  const [ved, setVed] = useState<VedId>(filters.ved === 'all' ? 'mo' : filters.ved)
  const [regionNum, setRegionNum] = useState<number>(() => { try { return Number(localStorage.getItem('upch-last-region')) || 38 } catch { return 38 } })
  const [period, setPeriod] = useState(filters.period)
  const [metric, setMetric] = useState<MetricId>(filters.metric)
  const [inds, setInds] = useState<Set<Ind>>(new Set(['n', 'rate', 'dyn', 'days', 'restored', 'repeat']))
  const reg = regionByNum.get(regionNum)!
  const cols = INDS.filter((i) => inds.has(i.id))
  const today = fmtDate(new Date().toISOString().slice(0, 10))

  const rep = useMemo(() => {
    if (tpl === 'ved') {
      const nat = aggregate(data, { ved }, period)
      const st = regionStats(data, { ved }, period)
      const top = rankRegions(st, metric, 10)
      const r = periodRange(period)!
      const inst = (ved === 'mvd' || ved === 'fsin') ? institutions.filter((i) => i.ved === ved).map((i) => { let n = 0; for (let k = r[0]; k <= r[1]; k++) n += i.m[k]; return { ...i, n } }).filter((i) => i.n >= INSTITUTION_MIN).sort((a, b) => b.n - a.n).slice(0, 10) : []
      return {
        title: `Справка для ведомства: ${vedById.get(ved)!.name}`, territory: 'Российская Федерация, все субъекты',
        summary: { label: 'Россия', a: nat, pop: POP_WITH_DATA },
        rows: top.map((s) => ({ name: REGIONS.find((x) => x.iso === s.iso)!.name + (s.status === 'estimate' ? ' (оценка)' : ''), a: s.agg, pop: REGIONS.find((x) => x.iso === s.iso)!.pop, conn: s.status === 'connected' })),
        rowsTitle: `Топ-10 регионов: ${METRICS.find((m) => m.id === metric)!.short.toLowerCase()}`,
        inst, recs: nationalRecs(data, period, ved, null),
      }
    }
    const conn = regionStatus(reg.iso) === 'connected'
    return {
      title: `Справка для губернатора: ${reg.name}`, territory: `${reg.name}, ${reg.fd}${conn ? '' : ' (регион не подключен к ФГИС УПЧ, оценка)'}`,
      summary: { label: reg.name, a: aggregate(data, { ved: 'all', region: reg.iso }, period), pop: reg.pop },
      rows: VEDS.flatMap((v) => [
        { name: v.short, a: aggregate(data, { ved: v.id, region: reg.iso }, period), pop: reg.pop, conn },
        { name: `${v.short}: Россия`, a: aggregate(data, { ved: v.id }, period), pop: POP_WITH_DATA, conn: true, nat: true },
      ]),
      rowsTitle: 'Ведомства в регионе и сравнение с Россией',
      inst: [], recs: regionRecs(data, institutions, reg.iso, period, 'all'),
    }
  }, [tpl, ved, reg, period, metric, data, institutions])

  const exportCsv = () => downloadCsv(`spravka_${tpl === 'ved' ? ved : reg.num}_${DATA_DATE}.csv`, [
    [rep.title], ['Территория', rep.territory], ['Период', periodLabel(period)], ['Дата формирования', today],
    ['Демонстрационные данные. Показатели являются основанием для проверки, а не для санкций.'], [],
    [rep.rowsTitle], ['Строка', ...cols.map((c) => c.name)],
    [rep.summary.label, ...cols.map((c) => c.csv(c.val(rep.summary.a, rep.summary.pop)))],
    ...rep.rows.map((r) => [r.name, ...cols.map((c) => (!r.conn && !['n', 'rate', 'dyn'].includes(c.id) ? '' : c.csv(c.val(r.a, r.pop))))]),
    [], ['Рекомендации'], ['Уровень', 'Адресат', 'Проблема', 'Показатель', 'Действие'],
    ...rep.recs.map((r) => [LEVEL_LABEL[r.level], r.addressee, r.title, r.indicator, r.action]),
    ...(rep.inst.length ? [[], ['Учреждения с 5 и более жалобами'], ['Учреждение', 'Жалоб'], ...rep.inst.map((i) => [i.name, String(i.n)])] : []),
  ])
  const toggle = (i: Ind) => setInds((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n })

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs()}` }, { label: 'Отчетность' }]} />
      <div className="no-print">
        <h1 className="text-2xl font-semibold">Отчетность</h1>
        <p className="text-muted">Справки для ведомства и губернатора: выберите шаблон и параметры, затем выгрузите таблицу или распечатайте.</p>
      </div>
      <div className="card card-pad grid gap-4 no-print">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Шаблон">
          {([['ved', 'Справка для ведомства'], ['gov', 'Справка для губернатора']] as const).map(([id, l]) => (
            <button key={id} role="radio" aria-checked={tpl === id} onClick={() => setTpl(id)}
              className={`rounded px-4 py-2 text-sm border ${tpl === id ? 'bg-accent text-white border-accent' : 'border-line2 hover:border-muted'}`}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          {tpl === 'ved' ? (
            <>
              <label className="grid gap-1"><span className="label">Ведомство</span>
                <select id="rep-ved" className="select" value={ved} onChange={(e) => setVed(e.target.value as VedId)}>{VEDS.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
              <label className="grid gap-1"><span className="label">Рейтинг по показателю</span>
                <select id="rep-metric" className="select" value={metric} onChange={(e) => setMetric(e.target.value as MetricId)}>{METRICS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
            </>
          ) : (
            <label className="grid gap-1"><span className="label">Территория</span>
              <select id="rep-region" className="select" value={regionNum} onChange={(e) => setRegionNum(Number(e.target.value))}>
                {[...REGIONS].sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((r) => <option key={r.num} value={r.num}>{r.name}</option>)}
              </select></label>
          )}
          <label className="grid gap-1"><span className="label">Период</span>
            <select id="rep-period" className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIOD_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
        </div>
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
          <legend className="label mb-1">Показатели</legend>
          {INDS.map((i) => (
            <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="w-4 h-4 accent-[#A3242F]" checked={inds.has(i.id)} onChange={() => toggle(i.id)} />{i.name}</label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={exportCsv}><Download size={16} aria-hidden />Выгрузить таблицу в CSV</button>
          <button className="btn-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden />Печатная версия</button>
        </div>
      </div>

      <article className="card card-pad grid gap-4 print-full" aria-label="Предпросмотр справки">
        <header className="grid gap-1 border-b border-line pb-3">
          <p className="text-xs text-muted uppercase tracking-wide">ФГИС УПЧ · ведомственная аналитическая панель</p>
          <h2 className="text-xl font-semibold">{rep.title}</h2>
          <p className="text-sm">Территория: {rep.territory}</p>
          <p className="text-sm">Период: {periodLabel(period)} · Дата формирования: {today}</p>
          <p className="text-sm font-medium text-accent-ink">Демонстрационные данные. Показатели являются основанием для проверки, а не для санкций.</p>
        </header>
        <section className="grid gap-2">
          <h3 className="font-semibold">Основные показатели: {rep.summary.label}</h3>
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            {cols.map((c) => (
              <div key={c.id} className="rounded border border-line p-3"><p className="label">{c.name}</p><p className="num text-lg font-semibold">{c.fmt(c.val(rep.summary.a, rep.summary.pop))}</p></div>
            ))}
          </div>
        </section>
        <section className="grid gap-2">
          <h3 className="font-semibold">{rep.rowsTitle}</h3>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>{tpl === 'ved' ? 'Регион' : 'Ведомство'}</th>{cols.map((c) => <th key={c.id} className="text-right">{c.name}</th>)}</tr></thead>
              <tbody>
                {rep.rows.map((r, i) => (
                  <tr key={i} className={'nat' in r && r.nat ? 'text-muted' : ''}>
                    <td>{r.name}</td>
                    {cols.map((c) => <td key={c.id} className="text-right num">{!r.conn && !['n', 'rate', 'dyn'].includes(c.id) ? 'н/д' : c.fmt(c.val(r.a, r.pop))}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {rep.inst.length > 0 && (
          <section className="grid gap-2">
            <h3 className="font-semibold">Учреждения с 5 и более жалобами</h3>
            <ul className="text-sm grid gap-1">{rep.inst.map((i) => <li key={i.id} className="flex justify-between gap-3 border-b border-line pb-1"><span>{i.name}</span><span className="num">{i.n}</span></li>)}</ul>
          </section>
        )}
        <section className="grid gap-2">
          <h3 className="font-semibold">Рекомендации</h3>
          <RecList recs={rep.recs} compact />
        </section>
        <footer className="text-xs text-muted border-t border-line pt-3">Карта для помощи, а не для наказания. Реальны только годовые объемы обращений по ведомствам (Доклад Уполномоченного за 2025 год, с. 558-559), остальные значения демонстрационные.</footer>
      </article>
    </div>
  )
}
