import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { geoConicEqualArea, geoPath } from 'd3-geo'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import type { ZoomBehavior } from 'd3-zoom'
import { select } from 'd3-selection'
import { feature, mesh } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection } from 'topojson-specification'
import { Plus, Minus, Maximize2, RotateCw } from 'lucide-react'
import { useGeo } from '../data/store'
import { regionByIso } from '../config/reference'
import { classColor, EST_FILL, EST_LINE, NODATA_FILL, BORDER_INNER, BORDER_COUNTRY, INK, ACCENT } from '../config/colors'

const W = 1000
const H = 560

export interface MapRegionView {
  status: 'connected' | 'estimate' | 'nodata'
  cls: number | null
}
export interface MapPoint { id: string; lon: number; lat: number; r: number; label: string }

interface Props {
  view: Map<string, MapRegionView>
  onSelect: (iso: string) => void
  tooltip: (iso: string) => ReactNode
  pointTooltip?: (id: string) => ReactNode
  points?: MapPoint[]
  highlight?: string | null
  height?: number
}

// Небольшие субъекты: выноски с подписью и увеличенной областью клика
const CALLOUTS: Record<string, { label: string; dx: number; dy: number }> = {
  MOW: { label: 'Москва', dx: -64, dy: -26 },
  SPE: { label: 'Санкт-Петербург', dx: -40, dy: -36 },
  SEV: { label: 'Севастополь', dx: -46, dy: 30 },
}

export default function RussiaMap({ view, onSelect, tooltip, pointTooltip, points = [], highlight, height }: Props) {
  const { geo, retry } = useGeo()
  const svgRef = useRef<SVGSVGElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [t, setT] = useState({ k: 1, x: 0, y: 0 })
  const [hover, setHover] = useState<string | null>(null)
  const [hoverPt, setHoverPt] = useState<string | null>(null)
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null)

  const prepared = useMemo(() => {
    if (geo.state !== 'ok') return null
    const topo = geo.value
    const obj = topo.objects.regions as GeometryCollection
    const fc = feature(topo, obj) as unknown as FeatureCollection<Geometry, { code: string; name: string }>
    const proj = geoConicEqualArea().rotate([-100, 0]).parallels([52, 64]).fitExtent([[12, 12], [W - 12, H - 12]], fc)
    const path = geoPath(proj)
    const inner = path(mesh(topo, obj, (a, b) => a !== b)) ?? ''
    const outer = path(mesh(topo, obj, (a, b) => a === b)) ?? ''
    const regions = fc.features.map((f) => ({
      iso: f.properties.code,
      d: path(f as Feature) ?? '',
      c: path.centroid(f as Feature),
      b: path.bounds(f as Feature),
    }))
    return { proj, regions, inner, outer }
  }, [geo])

  useEffect(() => {
    if (!svgRef.current || !prepared) return
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .translateExtent([[-100, -100], [W + 100, H + 100]])
      .on('zoom', (e) => setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }))
    zoomRef.current = z
    select(svgRef.current).call(z).on('dblclick.zoom', null)
    return () => { select(svgRef.current!).on('.zoom', null) }
  }, [prepared])

  // приблизить выделенный регион
  useEffect(() => {
    if (!prepared || !highlight || !svgRef.current || !zoomRef.current) return
    const r = prepared.regions.find((x) => x.iso === highlight)
    if (!r) return
    const [[x0, y0], [x1, y1]] = r.b
    const k = Math.max(1, Math.min(6, 0.5 / Math.max((x1 - x0) / W, (y1 - y0) / H)))
    const tr = zoomIdentity.translate(W / 2 - (k * (x0 + x1)) / 2, H / 2 - (k * (y0 + y1)) / 2).scale(k)
    select(svgRef.current).call(zoomRef.current.transform, tr)
  }, [highlight, prepared])

  const zoomBy = (f: number) => svgRef.current && zoomRef.current && select(svgRef.current).call(zoomRef.current.scaleBy, f)
  const reset = () => svgRef.current && zoomRef.current && select(svgRef.current).call(zoomRef.current.transform, zoomIdentity)

  const onMove = (e: React.MouseEvent) => {
    const rect = boxRef.current!.getBoundingClientRect()
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  if (geo.state === 'loading')
    return <div className="grid place-items-center text-muted" style={{ aspectRatio: `${W}/${H}` }}>Загрузка границ субъектов...</div>
  if (geo.state === 'error' || !prepared)
    return (
      <div className="grid place-items-center gap-3 text-center p-6 rounded bg-bg" style={{ aspectRatio: `${W}/${H}` }}>
        <div className="grid gap-2 justify-items-center">
          <p className="font-medium">Не удалось загрузить границы субъектов РФ</p>
          <p className="text-sm text-muted">Карта временно недоступна, показатели в таблицах ниже доступны.</p>
          <button className="btn-primary" onClick={retry}><RotateCw size={16} aria-hidden />Повторить загрузку</button>
        </div>
      </div>
    )

  const fillOf = (iso: string) => {
    const v = view.get(iso)
    if (!v || v.status === 'nodata') return NODATA_FILL
    if (v.status === 'estimate') return 'url(#hatch)'
    return classColor(v.cls)
  }
  const sw = (px: number) => px / t.k
  const hovered = hover ? prepared.regions.find((r) => r.iso === hover) : null
  const hl = highlight ? prepared.regions.find((r) => r.iso === highlight) : null

  return (
    <div ref={boxRef} className="relative select-none" onMouseLeave={() => { setHover(null); setHoverPt(null); setMouse(null) }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block cursor-grab active:cursor-grabbing touch-none"
        style={height ? { height } : undefined}
        role="group"
        aria-label="Карта субъектов Российской Федерации"
        onMouseMove={onMove}
      >
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={EST_FILL} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={EST_LINE} strokeWidth="1.6" />
          </pattern>
        </defs>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          {prepared.regions.map((r) => {
            const reg = regionByIso.get(r.iso)
            return (
              <path
                key={r.iso}
                d={r.d}
                fill={fillOf(r.iso)}
                stroke="none"
                tabIndex={0}
                role="button"
                aria-label={reg?.name}
                className="outline-none cursor-pointer focus-visible:opacity-80"
                onMouseEnter={() => setHover(r.iso)}
                onFocus={() => { setHover(r.iso); const rect = boxRef.current!.getBoundingClientRect(); setMouse({ x: ((r.c[0] * t.k + t.x) / W) * rect.width, y: ((r.c[1] * t.k + t.y) / H) * rect.height }) }}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(r.iso)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.iso) } }}
              />
            )
          })}
          <path d={prepared.inner} fill="none" stroke={BORDER_INNER} strokeWidth={sw(0.8)} strokeLinejoin="round" pointerEvents="none" />
          <path d={prepared.outer} fill="none" stroke={BORDER_COUNTRY} strokeWidth={sw(1.3)} strokeLinejoin="round" pointerEvents="none" />
          {hl && <path d={hl.d} fill="none" stroke={ACCENT} strokeWidth={sw(3)} strokeLinejoin="round" pointerEvents="none" />}
          {hovered && <path d={hovered.d} fill="none" stroke={INK} strokeWidth={sw(2.2)} strokeLinejoin="round" pointerEvents="none" />}

          {Object.entries(CALLOUTS).map(([iso, c]) => {
            const r = prepared.regions.find((x) => x.iso === iso)
            if (!r) return null
            const [cx, cy] = r.c
            const lx = cx + c.dx / t.k, ly = cy + c.dy / t.k
            return (
              <g key={iso} className="cursor-pointer" onMouseEnter={() => setHover(iso)} onClick={() => onSelect(iso)} aria-hidden>
                <line x1={cx} y1={cy} x2={lx} y2={ly} stroke={INK} strokeWidth={sw(0.8)} />
                <circle cx={cx} cy={cy} r={sw(5)} fill={fillOf(iso)} stroke={INK} strokeWidth={sw(1.2)} />
                <circle cx={cx} cy={cy} r={sw(11)} fill="transparent" />
                <text x={lx} y={ly - sw(3)} fontSize={sw(12)} textAnchor="middle" fill={INK} stroke="#fff" strokeWidth={sw(3)} paintOrder="stroke" fontWeight={500}>{c.label}</text>
              </g>
            )
          })}

          {points.map((p) => {
            const xy = prepared.proj([p.lon, p.lat])
            if (!xy) return null
            return (
              <circle
                key={p.id}
                cx={xy[0]} cy={xy[1]} r={sw(p.r)}
                fill={INK} fillOpacity={hoverPt === p.id ? 0.95 : 0.72} stroke="#fff" strokeWidth={sw(1.2)}
                className="cursor-pointer"
                tabIndex={0}
                role="img"
                aria-label={p.label}
                onMouseEnter={() => { setHoverPt(p.id); setHover(null) }}
                onMouseLeave={() => setHoverPt(null)}
                onFocus={() => setHoverPt(p.id)}
                onBlur={() => setHoverPt(null)}
              />
            )
          })}
        </g>
      </svg>

      <div className="absolute right-2 top-2 grid gap-1.5 no-print">
        <button className="btn-secondary !p-1.5" onClick={() => zoomBy(1.6)} aria-label="Приблизить" title="Приблизить"><Plus size={16} aria-hidden /></button>
        <button className="btn-secondary !p-1.5" onClick={() => zoomBy(1 / 1.6)} aria-label="Отдалить" title="Отдалить"><Minus size={16} aria-hidden /></button>
        <button className="btn-secondary !p-1.5" onClick={reset} aria-label="Показать всю Россию" title="Показать всю Россию"><Maximize2 size={16} aria-hidden /></button>
      </div>

      {mouse && (hoverPt || hover) && (
        <div
          className="pointer-events-none absolute z-20 w-[min(300px,80vw)] rounded border border-line bg-surface p-3 text-sm shadow-pop"
          style={{
            left: Math.min(mouse.x + 14, (boxRef.current?.clientWidth ?? 600) - 310),
            top: mouse.y + 16 > (boxRef.current?.clientHeight ?? 400) - 170 ? Math.max(0, mouse.y - 180) : mouse.y + 16,
          }}
          role="tooltip"
        >
          {hoverPt && pointTooltip ? pointTooltip(hoverPt) : hover ? tooltip(hover) : null}
        </div>
      )}
    </div>
  )
}
