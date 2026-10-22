import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { useStore } from '../data/store'
import { useFilters, periodRange, periodLabel } from '../state/filters'
import type { VedFilter } from '../state/filters'
import { VEDS, vedById, regionByIso, REGIONS, CATEGORIES, MONTHS } from '../config/reference'
import type { CategoryCode } from '../config/reference'
import { topicName } from '../data/aggregate'
import type { CaseCard } from '../data/types'
import { fmtDate, fmtInt } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import { Breadcrumbs, FilterChips } from '../components/ui'

export const FOLDERS = [
  { id: 'all', label: 'Все', test: () => true },
  { id: 'overdue', label: 'Просроченные ведомством', test: (c: CaseCard) => c.overdue > 0 },
  { id: 'review', label: 'На рассмотрении в ведомстве', test: (c: CaseCard) => c.status === 'На рассмотрении в ведомстве' || c.status === 'Просрочено ведомством' },
  { id: 'repeat', label: 'Повторные', test: (c: CaseCard) => c.repeat },
  { id: 'restored', label: 'Права восстановлены', test: (c: CaseCard) => c.status === 'Право восстановлено' },
] as const

export const STATUSES = ['На рассмотрении в ведомстве', 'Просрочено ведомством', 'Ответ получен', 'Право восстановлено', 'Нарушение не подтверждено', 'Разъяснено']

export function statusClass(s: string) {
  if (s === 'Право восстановлено') return 'bg-good-soft text-good'
  if (s === 'Просрочено ведомством') return 'bg-bad-soft text-bad'
  if (s === 'На рассмотрении в ведомстве' || s === 'Ответ получен') return 'bg-warn-soft text-warn'
  return 'bg-info-soft text-info'
}
export const PRIORITY_CLASS: Record<string, string> = {
  'Критический': 'bg-bad text-white', 'Высокий': 'bg-bad-soft text-bad', 'Средний': 'bg-warn-soft text-warn', 'Низкий': 'bg-info-soft text-info',
}

const PAGE = 20

export default function CasesPage() {
  const { cases } = useStore()
  const { filters, set, sp, qs } = useFilters()
  const [, setSp] = useSearchParams()
  const folder = sp.get('folder') ?? 'all'
  const region = sp.get('region')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'date' | 'overdue'>(folder === 'overdue' ? 'overdue' : 'date')
  const [page, setPage] = useState(0)
  const setParam = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp)
    if (v) n.set(k, v); else n.delete(k)
    setPage(0)
    setSp(n)
  }

  const base = useMemo(() => {
    const r = periodRange(filters.period)!
    const from = MONTHS[r[0]], to = MONTHS[r[1]]
    const s = q.trim().toLowerCase()
    return cases.filter((c) => {
      if (filters.ved !== 'all' && c.ved !== filters.ved) return false
      if (filters.topic && c.topic !== filters.topic) return false
      if (filters.cat && c.cat !== filters.cat) return false
      if (filters.status && c.status !== filters.status) return false
      if (region && c.region !== region) return false
      const ym = c.received.slice(0, 7)
      if (ym < from || ym > to) return false
      if (s && !(c.id.includes(s) || topicName(c.ved, c.topic).toLowerCase().includes(s) || c.organ.toLowerCase().includes(s))) return false
      return true
    })
  }, [cases, filters, region, q])
  const counts = Object.fromEntries(FOLDERS.map((f) => [f.id, base.filter(f.test).length]))
  const list = useMemo(() => {
    const f = FOLDERS.find((x) => x.id === folder) ?? FOLDERS[0]
    const l = base.filter(f.test)
    return sort === 'overdue' ? [...l].sort((a, b) => b.overdue - a.overdue) : l
  }, [base, folder, sort])
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages - 1)
  const vedObj = filters.ved !== 'all' ? vedById.get(filters.ved)! : null

  const exportCsv = () => downloadCsv(`obrashcheniya_${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Номер', 'Дата поступления', 'Статус', 'Канал', 'Ведомство', 'Тема', 'Категория прав', 'Регион', 'Орган, на который жалуются', 'Срок ответа, дн.', 'Просрочка, дн.', 'Повторное', 'Приоритет', 'Балл'],
    ...list.map((c) => [c.id, fmtDate(c.received), c.status, c.channel, vedById.get(c.ved)!.short, topicName(c.ved, c.topic), `${c.cat} ${CATEGORIES.find((x) => x.code === c.cat)!.name}`, regionByIso.get(c.region)!.name, c.organ, c.respDays, c.overdue, c.repeat ? 'да' : 'нет', c.priority.cls, c.priority.score]),
    [],
    ['Демонстрационные данные. Показатели являются основанием для проверки, а не для санкций.'],
  ])

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs()}` }, { label: 'Обращения' }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Обращения</h1>
          <p className="text-muted text-sm">Демонстрационная выборка карточек по подключенным регионам · {periodLabel(filters.period)}{region ? ` · ${regionByIso.get(region)?.name}` : ''}</p>
        </div>
        <button className="btn-secondary" onClick={exportCsv}><Download size={16} aria-hidden />Выгрузить в CSV ({fmtInt(list.length)})</button>
      </div>
      <FilterChips />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Папки">
        {FOLDERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={folder === f.id} onClick={() => setParam('folder', f.id === 'all' ? null : f.id)}
            className={`rounded-full px-3 py-1.5 text-sm border ${folder === f.id ? 'bg-accent text-white border-accent' : 'bg-surface border-line2 hover:border-muted'}`}>
            {f.label} <span className="num opacity-80">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div className="card p-3 flex flex-wrap gap-2 items-end">
        <label className="grid gap-1 min-w-0"><span className="label">Ведомство</span>
          <select id="cases-ved" className="select" value={filters.ved} onChange={(e) => set({ ved: e.target.value as VedFilter })}>
            <option value="all">Все ведомства</option>{VEDS.map((v) => <option key={v.id} value={v.id}>{v.short}</option>)}
          </select></label>
        <label className="grid gap-1 min-w-0"><span className="label">Тема</span>
          <select id="cases-topic" className="select" disabled={!vedObj} value={filters.topic ?? ''} onChange={(e) => set({ topic: e.target.value || null })}>
            <option value="">Все темы</option>{vedObj?.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select></label>
        <label className="grid gap-1 min-w-0"><span className="label">Регион</span>
          <select id="cases-region" className="select max-w-[220px]" value={region ?? ''} onChange={(e) => setParam('region', e.target.value || null)}>
            <option value="">Все регионы</option>{[...REGIONS].sort((a, b) => a.name.localeCompare(b.name, 'ru')).map((r) => <option key={r.iso} value={r.iso}>{r.name}</option>)}
          </select></label>
        <label className="grid gap-1 min-w-0"><span className="label">Категория прав</span>
          <select id="cases-cat" className="select max-w-[200px]" value={filters.cat ?? ''} onChange={(e) => set({ cat: (e.target.value || null) as CategoryCode | null })}>
            <option value="">Все категории</option>{CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.code} {c.name}</option>)}
          </select></label>
        <label className="grid gap-1 min-w-0"><span className="label">Статус</span>
          <select id="cases-status" className="select" value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || null })}>
            <option value="">Все статусы</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="grid gap-1 min-w-0"><span className="label">Сортировка</span>
          <select id="cases-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'overdue')}>
            <option value="date">По дате поступления</option><option value="overdue">По сроку просрочки</option>
          </select></label>
        <label className="grid gap-1 min-w-0 flex-1 basis-56"><span className="label">Поиск</span>
          <span className="flex items-center gap-2 rounded border border-line2 bg-surface px-3 py-2">
            <Search size={15} className="text-muted" aria-hidden />
            <input id="cases-q" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Номер, тема или орган" className="w-full bg-transparent text-sm outline-none" />
          </span></label>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Номер</th><th>Поступило</th><th>Статус</th><th>Ведомство и тема</th><th>Орган, на который жалуются</th><th>Регион</th><th className="text-right">Просрочка</th><th>Приоритет</th></tr></thead>
            <tbody>
              {list.slice(cur * PAGE, cur * PAGE + PAGE).map((c) => (
                <tr key={c.id}>
                  <td><Link className="link num whitespace-nowrap" to={`/case/${c.id}${qs()}`}>{c.id}</Link>{c.repeat && <span className="ml-1 badge bg-bg text-muted">повтор</span>}</td>
                  <td className="num whitespace-nowrap">{fmtDate(c.received)}</td>
                  <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
                  <td>{vedById.get(c.ved)!.short}<br /><span className="text-xs text-muted">{topicName(c.ved, c.topic)}</span></td>
                  <td className="max-w-[240px]">{c.organ}</td>
                  <td>{regionByIso.get(c.region)!.name}</td>
                  <td className={`text-right num ${c.overdue > 0 ? 'text-bad font-medium' : 'text-muted'}`}>{c.overdue > 0 ? `${c.overdue} дн.` : '-'}</td>
                  <td><span className={`badge ${PRIORITY_CLASS[c.priority.cls]}`}>{c.priority.cls} · {c.priority.score}</span></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} className="text-center text-muted py-8">Обращений с такими фильтрами нет</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-line text-sm">
          <span className="text-muted">Показано {list.length ? cur * PAGE + 1 : 0}-{Math.min(list.length, (cur + 1) * PAGE)} из {fmtInt(list.length)}</span>
          <div className="flex gap-1">
            <button className="btn-secondary !py-1" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Назад</button>
            <span className="px-2 py-1 num">{cur + 1} / {pages}</span>
            <button className="btn-secondary !py-1" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Вперед</button>
          </div>
        </div>
      </div>
    </div>
  )
}
