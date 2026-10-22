import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Map, Building2, BarChart3, FileText, Inbox, ClipboardList, Search, Menu, X } from 'lucide-react'
import { VEDS, VEDS_LATER, REGIONS, DATA_DATE } from '../config/reference'
import { useFilters, PERIOD_OPTIONS, periodLabel } from '../state/filters'
import type { VedFilter } from '../state/filters'
import { useStore } from '../data/store'
import { fmtDate } from '../lib/format'

const MENU = [
  { to: '/', label: 'Обзор по России', icon: Home, end: true },
  { to: '/map', label: 'Карта регионов', icon: Map },
  { to: '/veds', label: 'Ведомства', icon: Building2 },
  { to: '/regions', label: 'Региональная аналитика', icon: BarChart3 },
  { to: '/typical', label: 'Типовые обращения', icon: FileText },
  { to: '/cases', label: 'Обращения', icon: Inbox },
  { to: '/reports', label: 'Отчетность', icon: ClipboardList },
]

export const LAST_REGION_KEY = 'upch-last-region'
export const lastRegion = () => {
  try { return Number(localStorage.getItem(LAST_REGION_KEY)) || 38 } catch { return 38 }
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { qs } = useFilters()
  const loc = useLocation()
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} aria-hidden />}
      <nav
        className={`no-print fixed lg:sticky top-0 lg:top-3 z-40 h-screen lg:h-[calc(100vh-24px)] lg:m-3 lg:mr-0 w-[248px] shrink-0 bg-side text-side-ink flex flex-col px-3 py-5 gap-1 lg:rounded-[28px] overflow-hidden transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Основное меню"
      >
        <Link to={`/${qs({ mode: 'min' })}`} className="flex items-center gap-3 px-2 pb-5 pt-1 rounded" onClick={onClose}>
          <span className="relative grid place-items-center w-10 h-10 rounded-full bg-accent text-white text-[11px] font-display font-medium tracking-wide shadow-[0_0_0_4px_rgba(194,65,75,.18)]">УПЧ</span>
          <span className="leading-tight">
            <span className="block text-ink font-display font-medium tracking-tight">ФГИС УПЧ</span>
            <span className="block text-xs text-side-ink">Ведомственная панель</span>
          </span>
        </Link>
        {MENU.map((m) => {
          const to = m.to === '/regions' ? `/region/${lastRegion()}` : m.to
          const active = m.to === '/regions' ? loc.pathname.startsWith('/region') : undefined
          return (
            <NavLink
              key={m.to}
              to={`${to}${qs()}`}
              end={m.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition-colors ${(active ?? isActive) ? 'bg-side-act text-white font-semibold shadow-[0_8px_24px_-10px_rgba(194,65,75,.9)]' : 'hover:bg-black/[.05] hover:text-ink'}`
              }
            >
              <m.icon size={18} aria-hidden />
              {m.label}
            </NavLink>
          )
        })}
        <div className="mt-auto mx-1 rounded-[20px] bg-white/70 p-4 text-xs leading-snug text-side-ink"><span className="block font-display text-ink text-sm mb-1">Данные могут быть неточными</span>Демонстрационный режим: значения тестовые, для части регионов оценочные</div>
      </nav>
    </>
  )
}

function SearchBox() {
  const { cases } = useStore()
  const { qs } = useFilters()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const res = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const regs = REGIONS.filter((r) => r.name.toLowerCase().includes(s)).slice(0, 6).map((r) => ({ key: `r${r.num}`, label: r.name, hint: 'Регион', to: `/region/${r.num}` }))
    const cs = cases.filter((c) => c.id.includes(s)).slice(0, 5).map((c) => ({ key: c.id, label: `Обращение ${c.id}`, hint: c.status, to: `/case/${c.id}` }))
    return [...regs, ...cs]
  }, [q, cases])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const go = (to: string) => { nav(`${to}${qs()}`); setQ(''); setOpen(false) }
  return (
    <div ref={ref} className="relative w-full sm:w-64">
      <label className="flex items-center gap-2 rounded-full border border-line2 bg-surface px-4 py-2 focus-within:border-accent">
        <Search size={16} className="text-muted shrink-0" aria-hidden />
        <span className="sr-only">Поиск по региону и номеру обращения</span>
        <input
          id="global-search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) go(res[0].to); if (e.key === 'Escape') setOpen(false) }}
          placeholder="Регион или номер обращения"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      {open && res.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full sm:w-80 right-0 rounded-[18px] border border-line bg-surface shadow-pop py-2" role="listbox">
          {res.map((r) => (
            <li key={r.key}>
              <button className="w-full text-left px-3 py-2 hover:bg-bg flex justify-between gap-3 text-sm" onClick={() => go(r.to)}>
                <span>{r.label}</span><span className="text-muted text-xs shrink-0">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { filters, set } = useFilters()
  const nav = useNavigate()
  const loc = useLocation()
  const setVed = (v: VedFilter) => set({ ved: v })
  const setMode = (m: 'min' | 'gov') => {
    if (m === filters.mode) return
    if (m === 'gov') {
      const num = loc.pathname.startsWith('/region/') ? loc.pathname.split('/')[2] : String(lastRegion())
      nav(`/region/${num}?mode=gov&p=${filters.period}`)
    } else nav(`/?p=${filters.period}${filters.ved !== 'all' ? `&ved=${filters.ved}` : ''}`)
  }
  return (
    <header className="no-print lg:sticky top-3 z-20 mx-3 lg:mx-4 mt-3 rounded-[24px] glass shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 lg:px-6 py-2.5">
        <button className="lg:hidden btn-ghost !p-2" onClick={onMenu} aria-label="Открыть меню"><Menu size={20} aria-hidden /></button>
        <span className="font-display font-medium text-md tracking-tight whitespace-nowrap">Ведомственная карта</span>
        <span className="badge border border-accent/30 text-accent-ink bg-accent-soft" title="Все значения, кроме объемов по ведомствам из доклада, являются тестовыми">Демонстрационный режим</span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Обновлено {fmtDate(DATA_DATE)}</span>
          <SearchBox />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 lg:px-6 pb-2.5">
        <div className="flex items-center gap-2 min-w-0 max-w-full">
          <span className="label hidden md:inline">Ведомство</span>
          <div className="hidden xl:flex rounded-full bg-bg p-1" role="radiogroup" aria-label="Ведомство">
            {(['all', ...VEDS.map((v) => v.id)] as VedFilter[]).map((v) => {
              const on = filters.ved === v
              return (
                <button
                  key={v}
                  role="radio"
                  aria-checked={on}
                  onClick={() => setVed(v)}
                  className={`px-3.5 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${on ? 'bg-ink text-white font-semibold shadow' : 'text-ink hover:bg-surface'}`}
                >
                  {v === 'all' ? 'Все ведомства' : VEDS.find((x) => x.id === v)!.short}
                </button>
              )
            })}
          </div>
          <select
            id="ved-select"
            className="select xl:hidden max-w-[60vw]"
            value={filters.ved}
            onChange={(e) => setVed(e.target.value as VedFilter)}
            aria-label="Ведомство"
          >
            <option value="all">Все ведомства</option>
            {VEDS.map((v) => <option key={v.id} value={v.id}>{v.short}</option>)}
            <optgroup label="Подключается позже">
              {VEDS_LATER.map((n) => <option key={n} disabled>{n}</option>)}
            </optgroup>
          </select>
          <select className="select hidden xl:block w-28" value="" onChange={() => {}} aria-label="Другие ведомства">
            <option value="">Другие</option>
            <optgroup label="Подключается позже">
              {VEDS_LATER.map((n) => <option key={n} disabled>{n}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="flex rounded-full bg-bg p-1 text-sm" role="radiogroup" aria-label="Режим просмотра">
          {(['min', 'gov'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={filters.mode === m} onClick={() => setMode(m)}
              className={`px-3.5 py-1.5 rounded-full transition-all ${filters.mode === m ? 'bg-accent text-white font-semibold shadow' : 'text-muted hover:text-ink'}`}>
              {m === 'min' ? 'Министерство' : 'Губернатор'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="label">Период</span>
          <select id="period-select" className="select" value={filters.period} onChange={(e) => set({ period: e.target.value })}>
            {!PERIOD_OPTIONS.some((o) => o.id === filters.period) && <option value={filters.period}>{periodLabel(filters.period)}</option>}
            {PERIOD_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </div>
    </header>
  )
}

export function Footer() {
  const { data } = useStore()
  return (
    <footer className="mt-10 mx-3 lg:mx-4 mb-3 rounded-[24px] bg-side text-side-ink px-6 py-5 text-xs grid gap-1.5">
      <p className="text-sm text-ink font-display font-normal tracking-tight">Данные могут быть неточными: значения демонстрационные, для неподключенных регионов оценочные.</p>
      <p>Демонстрационные данные. Реальны только годовые объемы обращений, направленных в ведомства (источник: {data.meta.source}). Распределение по регионам, темам и месяцам, сроки и доли сгенерированы для демонстрации.</p>
    </footer>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && <button className="fixed top-3 left-[256px] z-50 btn-secondary !p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Закрыть меню"><X size={18} aria-hidden /></button>}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main key={loc.pathname} className="page-enter flex-1 px-4 lg:px-7 py-6 print-full">{children}</main>
        <Footer />
      </div>
    </div>
  )
}
