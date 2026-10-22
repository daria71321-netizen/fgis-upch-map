import { Link } from 'react-router-dom'
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from 'recharts'
import { CHART, MUTED, LINE } from '../config/colors'
import { fmtInt, fmtPct, fmtSignedPct } from '../lib/format'
import { monthLabel } from '../state/filters'

export function MonthlyChart({ rows }: { rows: { m: string; cur: number | null; prev: number | null; partial: boolean }[] }) {
  const year = rows[0]?.m.slice(0, 4)
  const partial = rows.find((r) => r.partial && r.cur !== null)
  const data = rows.map((r) => ({ ...r, label: monthLabel(r.m, true).split(' ')[0] }))
  return (
    <div className="grid gap-2">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={LINE} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={{ stroke: LINE }} />
            <YAxis tick={{ fontSize: 12, fill: MUTED }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtInt(v)} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtInt(v), name]}
              labelFormatter={(l, p) => {
                const r = p?.[0]?.payload as { m: string; partial: boolean } | undefined
                return r ? `${monthLabel(r.m)}${r.partial ? ' (неполный месяц, по 22 число)' : ''}` : String(l)
              }}
              contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: LINE }}
            />
            <Line type="monotone" dataKey="prev" name={`${Number(year) - 1} год`} stroke={CHART.prev} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="cur" name={`${year} год`} stroke={CHART.cur} strokeWidth={2.5} dot={{ r: 2.5, fill: CHART.cur }} connectNulls={false} isAnimationActive={false} />
            {partial && <ReferenceDot x={monthLabel(partial.m, true).split(' ')[0]} y={partial.cur!} r={6} fill="#fff" stroke={CHART.cur} strokeWidth={2} strokeDasharray="2 2" />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 h-0.5" style={{ background: CHART.cur }} />{year} год</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: CHART.prev }} />{Number(year) - 1} год</span>
        {partial && <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-full border-2 border-dashed" style={{ borderColor: CHART.cur }} />{monthLabel(partial.m)}: неполный месяц</span>}
      </div>
    </div>
  )
}

export interface BarRow { key: string; name: string; n: number; share: number; dyn: number | null; to?: string; hint?: string }

/** Горизонтальные столбцы, отсортированные по количеству; темы с наибольшим ростом выделены */
export function BarList({ rows, highlightGrowth = 25 }: { rows: BarRow[]; highlightGrowth?: number }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <ul className="grid gap-2.5">
      {rows.map((r) => {
        const hot = r.dyn !== null && r.dyn >= highlightGrowth && r.n >= 10
        const inner = (
          <div className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={`min-w-0 ${hot ? 'font-semibold' : ''}`}>
                {r.name}
                {hot && <span className="ml-2 badge bg-bad-soft text-bad">рост</span>}
                {r.hint && <span className="ml-2 text-xs text-muted">{r.hint}</span>}
              </span>
              <span className="num text-xs whitespace-nowrap text-muted">
                <b className="text-ink">{fmtInt(r.n)}</b> · {fmtPct(r.share)} · <span className="text-ink">{fmtSignedPct(r.dyn)}</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: hot ? CHART.barHi : CHART.bar }} />
            </div>
          </div>
        )
        return (
          <li key={r.key}>
            {r.to ? <Link to={r.to} className="block rounded -mx-1 px-1 py-0.5 hover:bg-bg">{inner}</Link> : inner}
          </li>
        )
      })}
    </ul>
  )
}
