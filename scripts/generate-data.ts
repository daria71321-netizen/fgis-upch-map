// Генератор демонстрационных данных. Детерминированный (фиксированный seed):
// у всех пользователей одинаковые цифры. Запуск: npm run data
// Реальные только годовые объемы по ведомствам за 2025 год (и 2023 для Минобороны и ФСИН),
// см. REPORT_SOURCE. Все остальное демонстрационное.
import fs from 'node:fs'
import path from 'node:path'
import { geoBounds, geoContains } from 'd3-geo'
import type { Feature, FeatureCollection } from 'geojson'
import {
  REGIONS, VEDS, MONTHS, PARTIAL_MONTH, CONNECTED, NODATA, regionStatus, DATA_DATE, REPORT_SOURCE,
  SUBCATEGORIES, catOfSub,
} from '../src/config/reference.ts'
import type { VedId, Region } from '../src/config/reference.ts'
import { priorityScore, priorityClass, isSystemic, APPEAL_TYPES } from '../src/config/priority.ts'
import type { PriorityInput } from '../src/config/priority.ts'
import { LEGAL_DAYS } from '../src/config/thresholds.ts'

const SEED = 20261023
const OUT = path.resolve('public/data')

// ---------- RNG ----------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(SEED)
const uni = (a: number, b: number) => a + (b - a) * rnd()
const randn = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
const binom = (n: number, p: number) => { let k = 0; for (let i = 0; i < n; i++) if (rnd() < p) k++; return k }
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

// ---------- Годовые объемы по ведомствам ----------
// 2025 (и 2023 у Минобороны, ФСИН) из доклада; остальные годы демонстрационные.
// 2026: январь - 22 октября.
const TOTALS: Record<VedId, Record<number, number>> = {
  mo: { 2023: 14432, 2024: 17350, 2025: 20283, 2026: 18850 },
  prok: { 2023: 7600, 2024: 7980, 2025: 8347, 2026: 7130 },
  mvd: { 2023: 1420, 2024: 1350, 2025: 1283, 2026: 1060 },
  fsin: { 2023: 1441, 2024: 1120, 2025: 889, 2026: 690 },
  // 140 в Минтруд (доклад) + обращения в отделения СФР (демо)
  trud: { 2023: 2950, 2024: 3200, 2025: 3460, 2026: 3020 },
}
const TOTAL_REAL: Record<VedId, number[]> = { mo: [2023, 2025], prok: [2025], mvd: [2025], fsin: [2023, 2025], trud: [] }

// Повышающие коэффициенты по регионам (демо): Минобороны выше в регионах с большим числом участников СВО
const BOOST: Record<VedId, Record<string, number>> = {
  mo: { BU: 2.9, ZAB: 2.3, TY: 2.4, IRK: 1.9, KYA: 1.5, BEL: 2.2, KRS: 2.0, BRY: 1.7, ROS: 1.6, DPR: 2.1, LPR: 2.0, CR: 1.4, SEV: 1.7, ALT: 1.3, KHA: 1.5, AMU: 1.4, PRI: 1.3, MOW: 0.45, SPE: 0.55, MOS: 0.6, TA: 0.8 },
  prok: { DA: 1.6, CE: 1.2, SAR: 1.7, KEM: 1.3, IRK: 1.4, PRI: 1.3, ZAB: 1.4, MOW: 0.7, KYA: 1.2 },
  mvd: { MOW: 1.5, MOS: 1.4, SPE: 1.3, KDA: 1.3, TUL: 1.2, SVE: 1.2, NVS: 1.1 },
  fsin: { KYA: 1.6, IRK: 1.8, PER: 1.9, SVE: 1.4, KO: 2.0, MOS: 1.1, KEM: 1.5, MO: 2.2, TVE: 1.3, ZAB: 1.4 },
  trud: { NIZ: 1.5, DPR: 1.6, LPR: 1.4, SAR: 1.3, CHE: 1.2, MOW: 0.8, TUL: 1.1 },
}
// Тренд (годовой рост) по ведомству и разброс по регионам
const TREND: Record<VedId, [number, number]> = { mo: [0.17, 0.16], prok: [0.05, 0.12], mvd: [-0.04, 0.14], fsin: [-0.2, 0.18], trud: [0.08, 0.14] }
const TOPIC_BASE: Record<VedId, number[]> = {
  mo: [0.26, 0.38, 0.2, 0.16], prok: [0.42, 0.36, 0.22], mvd: [0.34, 0.33, 0.14, 0.19],
  fsin: [0.46, 0.38, 0.16], trud: [0.3, 0.32, 0.22, 0.16],
}
// Особые сюжеты для демонстрации
const SPECIAL_GROWTH: Record<string, number> = {
  'IRK|mo|pay': 0.55, 'BU|mo|pay': 0.45, 'ZAB|mo|search': 0.4, 'KYA|mo|pay': 0.32, 'SAR|prok|orphans': 0.4,
  'NIZ|trud|tsr': 0.3, 'IRK|prok|nonexec': 0.3, 'PER|fsin|fmed': 0.35,
}
const season = (m: number) => 1 + 0.12 * Math.cos(((m - 3) / 12) * 2 * Math.PI) - (m === 1 ? 0.15 : 0) - (m === 5 ? 0.06 : 0)
const PARTIAL_FACTOR = 22 / 31

const regions = REGIONS.filter((r) => !NODATA.has(r.iso))

type Series = {
  r: string; v: VedId; t: string
  n: number[]
  // только для подключенных регионов:
  ans?: number[]; dsum?: number[]; late?: number[]; done?: number[]; viol?: number[]; rest?: number[]; rep?: number[]
}

// Качество работы ведомства в регионе (демо): срок ответа, доля восстановленных, повторные
type Quality = { days: number; restore: number; repeat: number }
const quality = new Map<string, Quality>()
const VED_Q: Record<VedId, Quality> = {
  mo: { days: 33, restore: 0.4, repeat: 0.14 }, prok: { days: 22, restore: 0.5, repeat: 0.11 },
  mvd: { days: 26, restore: 0.36, repeat: 0.12 }, fsin: { days: 24, restore: 0.32, repeat: 0.15 },
  trud: { days: 21, restore: 0.56, repeat: 0.08 },
}
const BAD_REGIONS: Record<string, number> = { IRK: 1.35, ZAB: 1.3, BU: 1.25, KYA: 1.15, SAR: 1.2, DPR: 1.25, PRI: 1.1 }
const GOOD_REGIONS: Record<string, number> = { TA: 0.72, TUL: 0.78, BEL: 0.85, KLU: 0.8, TYU: 0.8, MOW: 0.85, NIZ: 0.88 }
for (const r of REGIONS) for (const v of VEDS) {
  const f = (BAD_REGIONS[r.iso] ?? GOOD_REGIONS[r.iso] ?? 1) * Math.exp(randn() * 0.18)
  const q = VED_Q[v.id]
  quality.set(`${r.iso}|${v.id}`, {
    days: clamp(q.days * f, 9, 58),
    restore: clamp(q.restore / f + randn() * 0.05, 0.1, 0.75),
    repeat: clamp(q.repeat * f * f + randn() * 0.02, 0.02, 0.34),
  })
}

const series: Series[] = []
const yearOf = (mi: number) => Number(MONTHS[mi].slice(0, 4))
const monthOf = (mi: number) => Number(MONTHS[mi].slice(5, 7))

for (const v of VEDS) {
  const nT = v.topics.length
  // веса ячеек
  const w: number[][][] = regions.map((r) => {
    const boost = BOOST[v.id][r.iso] ?? 1
    const base = r.pop * boost * Math.exp(randn() * 0.32)
    const g = TREND[v.id][0] + randn() * TREND[v.id][1]
    const shares = TOPIC_BASE[v.id].map((s) => s * Math.exp(randn() * 0.25))
    return v.topics.map((t, ti) => {
      const gt = g + (SPECIAL_GROWTH[`${r.iso}|${v.id}|${t.id}`] ?? 0) + randn() * 0.06
      return MONTHS.map((_, mi) => {
        const yrs = (yearOf(mi) - 2023) + (monthOf(mi) - 1) / 12
        let x = base * shares[ti] * Math.pow(Math.max(0.3, 1 + gt), yrs) * season(monthOf(mi)) * Math.exp(randn() * 0.12)
        if (MONTHS[mi] === PARTIAL_MONTH) x *= PARTIAL_FACTOR
        return x
      })
    })
  })
  const counts: number[][][] = regions.map(() => v.topics.map(() => MONTHS.map(() => 0)))
  // распределяем годовые суммы методом наибольших остатков
  for (const y of [2023, 2024, 2025, 2026]) {
    const cells: [number, number, number, number][] = []
    let sw = 0
    regions.forEach((_, ri) => v.topics.forEach((__, ti) => MONTHS.forEach((m, mi) => {
      if (yearOf(mi) !== y) return
      cells.push([ri, ti, mi, w[ri][ti][mi]]); sw += w[ri][ti][mi]
    })))
    const T = TOTALS[v.id][y]
    let used = 0
    const rema: [number, number][] = []
    cells.forEach(([ri, ti, mi, x], ci) => {
      const e = (x / sw) * T
      const k = Math.floor(e)
      counts[ri][ti][mi] = k; used += k; rema.push([e - k, ci])
    })
    rema.sort((a, b) => b[0] - a[0])
    for (let i = 0; i < T - used; i++) { const [ri, ti, mi] = cells[rema[i][1]]; counts[ri][ti][mi]++ }
  }
  regions.forEach((r, ri) => v.topics.forEach((t, ti) => {
    const s: Series = { r: r.iso, v: v.id, t: t.id, n: counts[ri][ti] }
    if (CONNECTED.has(r.iso)) {
      const q = quality.get(`${r.iso}|${v.id}`)!
      s.ans = []; s.dsum = []; s.late = []; s.done = []; s.viol = []; s.rest = []; s.rep = []
      const nM = MONTHS.length
      s.n.forEach((n, mi) => {
        const age = nM - 1 - mi // месяцев назад
        const compl = age >= 4 ? 0.95 : age === 3 ? 0.85 : age === 2 ? 0.7 : age === 1 ? 0.5 : 0.25
        const ans = binom(n, Math.min(0.98, compl + 0.03))
        let dsum = 0, late = 0
        const md = q.days * (1 + 0.05 * Math.sin(mi / 3))
        for (let i = 0; i < ans; i++) {
          const d = Math.max(3, Math.round(md * Math.exp(randn() * 0.35)))
          dsum += d; if (d > LEGAL_DAYS) late++
        }
        const done = binom(n, compl)
        const viol = binom(done, 0.62)
        const rest = binom(viol, clamp(q.restore + (yearOf(mi) - 2025) * 0.02, 0.05, 0.9))
        const rep = binom(n, q.repeat)
        s.ans!.push(ans); s.dsum!.push(dsum); s.late!.push(late); s.done!.push(done); s.viol!.push(viol); s.rest!.push(rest); s.rep!.push(rep)
      })
    }
    series.push(s)
  }))
}

// ---------- Муниципалитеты (для подключенных регионов) ----------
const MUNI: Record<string, string[]> = {
  MOW: ['Юго-Восточный АО', 'Восточный АО', 'Северный АО', 'Южный АО'],
  MOS: ['Балашиха', 'Подольск', 'Химки', 'Мытищи'],
  SPE: ['Невский район', 'Калининский район', 'Приморский район', 'Выборгский район'],
  NIZ: ['Нижний Новгород', 'Дзержинск', 'Арзамас', 'Саров'],
  SVE: ['Екатеринбург', 'Нижний Тагил', 'Каменск-Уральский', 'Первоуральск'],
  SAR: ['Саратов', 'Энгельс', 'Балаково', 'Балашов'],
  TUL: ['Тула', 'Новомосковск', 'Донской', 'Алексин'],
  KDA: ['Краснодар', 'Сочи', 'Новороссийск', 'Армавир'],
  BU: ['Улан-Удэ', 'Северобайкальск', 'Гусиноозерск', 'Кяхтинский район'],
  TA: ['Казань', 'Набережные Челны', 'Нижнекамск', 'Альметьевск'],
  BA: ['Уфа', 'Стерлитамак', 'Салават', 'Нефтекамск'],
  SAM: ['Самара', 'Тольятти', 'Сызрань', 'Новокуйбышевск'],
  NVS: ['Новосибирск', 'Бердск', 'Искитим', 'Куйбышев'],
  ROS: ['Ростов-на-Дону', 'Таганрог', 'Шахты', 'Новочеркасск'],
  VOR: ['Воронеж', 'Борисоглебск', 'Россошь', 'Лиски'],
  BEL: ['Белгород', 'Старый Оскол', 'Шебекино', 'Губкин'],
  PER: ['Пермь', 'Березники', 'Соликамск', 'Чайковский'],
  CHE: ['Челябинск', 'Магнитогорск', 'Златоуст', 'Миасс'],
  IRK: ['Иркутск', 'Братск', 'Ангарск', 'Усть-Илимск'],
  KYA: ['Красноярск', 'Норильск', 'Ачинск', 'Канск'],
  PRI: ['Владивосток', 'Уссурийск', 'Находка', 'Артем'],
  KHA: ['Хабаровск', 'Комсомольск-на-Амуре', 'Амурск', 'Советская Гавань'],
  ZAB: ['Чита', 'Краснокаменск', 'Борзя', 'Нерчинск'],
  KLU: ['Калуга', 'Обнинск', 'Людиново', 'Козельск'],
  TYU: ['Тюмень', 'Тобольск', 'Ишим', 'Ялуторовск'],
  DPR: ['Донецк', 'Макеевка', 'Мариуполь', 'Горловка'],
}
const munis: Record<string, { name: string; share: number; growth: number; topic: string }[]> = {}
for (const iso of CONNECTED) {
  const names = MUNI[iso]
  const raw = names.map((_, i) => (i === 0 ? 2.4 : 1) * Math.exp(randn() * 0.4))
  const s = raw.reduce((a, b) => a + b, 0)
  munis[iso] = names.map((name, i) => {
    const v = pick(VEDS)
    return { name, share: +(raw[i] / s).toFixed(3), growth: Math.round(randn() * 18 + (BAD_REGIONS[iso] ? 22 : 6)), topic: `${v.id}:${pick(v.topics).id}` }
  })
}

// ---------- Учреждения МВД и ФСИН ----------
const geo = JSON.parse(fs.readFileSync(path.join(OUT, 'regions.geojson'), 'utf8')) as FeatureCollection
const featByIso = new Map(geo.features.map((f) => [String(f.properties!.code), f as Feature]))
function pointIn(iso: string, center: [number, number] | null): [number, number] {
  const f = featByIso.get(iso)!
  const [[x0, y0], [x1, y1]] = geoBounds(f)
  const spanX = x1 > x0 ? x1 - x0 : x1 + 360 - x0
  for (let i = 0; i < 4000; i++) {
    let lon: number, lat: number
    if (center && i < 2500) { lon = center[0] + randn() * spanX * 0.08; lat = center[1] + randn() * (y1 - y0) * 0.08 }
    else { lon = x0 + rnd() * spanX; lat = y0 + rnd() * (y1 - y0) }
    if (lon > 180) lon -= 360
    if (geoContains(f, [lon, lat])) return [+lon.toFixed(3), +lat.toFixed(3)]
  }
  throw new Error('no point in ' + iso)
}
// столицы регионов (lon, lat) для правдоподобного размещения
const CAP: Record<string, [number, number]> = {
  MOW: [37.62, 55.75], MOS: [37.4, 55.6], SPE: [30.32, 59.94], NIZ: [44.0, 56.33], SVE: [60.6, 56.84], SAR: [46.03, 51.53],
  TUL: [37.62, 54.19], KDA: [38.98, 45.04], BU: [107.6, 51.83], TA: [49.12, 55.79], BA: [55.97, 54.74], SAM: [50.15, 53.2],
  NVS: [82.92, 55.03], ROS: [39.72, 47.23], VOR: [39.2, 51.67], BEL: [36.59, 50.6], PER: [56.25, 58.01], CHE: [61.4, 55.16],
  IRK: [104.3, 52.29], KYA: [92.87, 56.01], PRI: [131.9, 43.12], KHA: [135.07, 48.48], ZAB: [113.5, 52.03], KLU: [36.26, 54.51],
  TYU: [65.53, 57.15], DPR: [37.8, 48.0],
}
type Inst = { id: string; ved: 'mvd' | 'fsin'; type: string; name: string; r: string; lon: number; lat: number; cap: number; m: number[]; topics: number[]; visits: { date: string; by: string; result: string }[] }
const institutions: Inst[] = []
const seriesBy = (iso: string, v: VedId) => series.filter((s) => s.r === iso && s.v === v)
for (const iso of CONNECTED) {
  const reg = REGIONS.find((r) => r.iso === iso)!
  for (const vid of ['mvd', 'fsin'] as const) {
    const ss = seriesBy(iso, vid)
    const k = vid === 'fsin' ? 3 + Math.floor(rnd() * 4) : 2 + Math.floor(rnd() * 3)
    const shares = Array.from({ length: k }, (_, i) => Math.pow(0.55, i) * Math.exp(randn() * 0.3))
    const tot = shares.reduce((a, b) => a + b, 0)
    const types = vid === 'fsin' ? ['ИК', 'СИЗО', 'ИК', 'ЛИУ', 'ИК', 'КП', 'ИК'] : ['ИВС', 'ЦВСИГ', 'ИВС', 'ИВС']
    const used: Record<string, number> = {}
    const insts: Inst[] = shares.map((sh, i) => {
      const type = types[i % types.length]
      used[type] = (used[type] ?? 0) + 1
      const no = type === 'ЦВСИГ' ? '' : `-${used[type] + (type === 'ИК' ? Math.floor(rnd() * 20) : 0)}`
      const muni = MUNI[iso][i % 4]
      const name = vid === 'fsin' ? `${type}${no} УФСИН (${reg.name})` : type === 'ЦВСИГ' ? `ЦВСИГ (${reg.name})` : `ИВС ОМВД по г. ${muni}`
      const [lon, lat] = pointIn(iso, i === 0 || vid === 'mvd' ? CAP[iso] : null)
      return { id: `${vid}-${iso}-${i + 1}`, ved: vid, type, name, r: iso, lon, lat, cap: vid === 'fsin' ? Math.round(uni(300, 1600) / 10) * 10 : Math.round(uni(20, 120)), m: MONTHS.map(() => 0), topics: ss.map(() => 0), visits: [], _sh: sh / tot } as Inst & { _sh: number }
    })
    // распределяем жалобы ведомства на учреждения: только темы про условия и медпомощь (МВД: ИВС)
    ss.forEach((s, ti) => {
      const instTopic = vid === 'fsin' || s.t === 'ivs'
      if (!instTopic) return
      s.n.forEach((n, mi) => {
        for (let j = 0; j < n; j++) {
          let x = rnd(), ii = 0
          for (; ii < insts.length - 1; ii++) { x -= (insts[ii] as Inst & { _sh: number })._sh; if (x < 0) break }
          insts[ii].m[mi]++; insts[ii].topics[ti]++
        }
      })
    })
    for (const it of insts) {
      delete (it as Partial<Inst & { _sh: number }>)._sh
      const nv = Math.floor(rnd() * 3)
      for (let j = 0; j < nv; j++) {
        const mm = 1 + Math.floor(rnd() * 9)
        const by = pick(['Уполномоченный по правам человека в субъекте', 'ОНК', 'Уполномоченный и ОНК (совместный выезд)'])
        const result = pick(vid === 'fsin'
          ? ['Выявлены нарушения в организации медпомощи, внесено представление', 'Нарушений не выявлено', 'Условия содержания приведены в норму после выезда', 'Направлен запрос в УФСИН о проверке жалоб на медпомощь']
          : ['Выявлено отсутствие прогулок, нарушение устранено', 'Нарушений не выявлено', 'Рекомендован ремонт камер, срок 3 месяца'])
        it.visits.push({ date: `2026-${String(mm).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 27)).padStart(2, '0')}`, by, result })
      }
      it.visits.sort((a, b) => b.date.localeCompare(a.date))
      institutions.push(it)
    }
  }
}

// ---------- Регион × ведомство: дополнительные показатели ----------
const extras: Record<string, unknown> = {}
for (const iso of CONNECTED) {
  const reg = REGIONS.find((r) => r.iso === iso)!
  // Прокуратура: повторяющиеся нарушения (кластеры жалоб одного типа на один орган за квартал)
  const prokS = seriesBy(iso, 'prok')
  const clusters: { q: string; organ: string; topic: string; count: number }[] = []
  prokS.forEach((s) => {
    for (let qi = 0; qi < MONTHS.length; qi += 3) {
      const qn = s.n.slice(qi, qi + 3).reduce((a, b) => a + b, 0)
      if (qn < 5) continue
      const k = 3 + Math.floor(rnd() * 5)
      const sh = Array.from({ length: k }, (_, i) => Math.pow(0.5, i))
      const st = sh.reduce((a, b) => a + b, 0)
      const organs = MUNI[iso].flatMap((m) => [
        s.t === 'orphans' ? `Администрация г. ${m}` : s.t === 'nonexec' ? `ОСП по г. ${m}` : `Отдел полиции г. ${m}`,
        s.t === 'orphans' ? `Отдел опеки и попечительства г. ${m}` : `Администрация г. ${m}`,
      ])
      sh.forEach((x, i) => {
        const c = Math.round((qn * x) / st)
        if (c >= 5) clusters.push({ q: MONTHS[qi], organ: organs[i % organs.length], topic: s.t, count: c })
      })
    }
  })
  const prokN = prokS.reduce((a, s) => a + s.n.reduce((x, y) => x + y, 0), 0)
  // Минтруд и СФР: категории заявителей, отделения СФР
  const cat = [uni(0.28, 0.42), uni(0.16, 0.26), uni(0.2, 0.32)]
  const sfr = MUNI[iso].map((m, i) => ({ name: i === 0 ? `Отделение СФР (${reg.name})` : `Клиентская служба СФР в г. ${m}`, share: +(Math.pow(0.6, i) * uni(0.7, 1.3)).toFixed(3) }))
  extras[iso] = {
    munis: munis[iso],
    prok: { clusters, cancelled: Math.round(prokN * uni(0.08, 0.16)), officials: Math.round(prokN * uni(0.025, 0.06)) },
    trud: { applicants: { 'Люди с инвалидностью': +cat[0].toFixed(3), 'Многодетные семьи': +cat[1].toFixed(3), 'Пенсионеры': +cat[2].toFixed(3), 'Другие': +(1 - cat[0] - cat[1] - cat[2]).toFixed(3) }, sfr },
  }
}

// ---------- Карточки обращений (выборка для подключенных регионов) ----------
const CHANNELS = ['Электронная приемная', 'Почтовое отправление', 'Личный прием', 'Горячая линия', 'Видеообращение', 'Выездной прием', 'Аудиообращение']
const SUMMARY: Record<string, string[]> = {
  'mo:search': ['Заявитель просит установить местонахождение сына, военнослужащего, связь с которым потеряна более трех месяцев.', 'Просьба включить военнослужащего в списки на обмен и сообщить о его статусе.'],
  'mo:pay': ['Не выплачена единовременная выплата за ранение, заявление подано пять месяцев назад.', 'Семье погибшего военнослужащего не перечислены страховые выплаты.', 'Задержка ежемесячного денежного довольствия, ответ из военкомата не получен.'],
  'mo:med': ['Военнослужащему после ранения не обеспечено долечивание и протезирование.', 'Отказ в направлении на военно-врачебную комиссию.'],
  'mo:dismiss': ['Заявитель просит рассмотреть рапорт об увольнении по состоянию здоровья, рапорт не рассмотрен.', 'Не оформлено увольнение по достижении предельного возраста.'],
  'prok:delay': ['Обращение в администрацию остается без ответа более двух месяцев.', 'Орган местного самоуправления не принимает решение по заявлению о ремонте дороги.'],
  'prok:nonexec': ['Решение суда о расселении аварийного дома не исполняется два года.', 'Не исполнено решение суда о восстановлении на работе.'],
  'prok:orphans': ['Лицо из числа детей-сирот восьмой год ожидает предоставления жилья.', 'Предоставленная квартира непригодна для проживания.'],
  'mvd:invest': ['Расследование уголовного дела приостанавливалось шесть раз без проведения следственных действий.', 'Заявление о преступлении не зарегистрировано.'],
  'mvd:fraud': ['Пожилой заявитель потерял сбережения в результате телефонного мошенничества, проверка затягивается.', 'Отказ в возбуждении дела о мошенничестве при покупке через интернет.'],
  'mvd:ivs': ['Жалоба на отсутствие ежедневных прогулок и питьевой воды в ИВС.', 'Переполненность камер, отсутствие постельных принадлежностей.'],
  'mvd:migr': ['Длительное оформление вида на жительство супруги гражданина РФ.', 'Помещение в ЦВСИГ без решения суда о выдворении.'],
  'fsin:fmed': ['Осужденному с хроническим заболеванием не предоставляется необходимое лечение.', 'Отказ в консультации узкого специалиста, состояние здоровья ухудшается.'],
  'fsin:cond': ['Жалоба на сырость и плесень в отряде, нарушение норм жилой площади.', 'Ограничение переписки и телефонных звонков с родственниками.'],
  'fsin:release': ['Не направлены документы на освидетельствование для освобождения по болезни.', 'Отказ в медицинском освидетельствовании при тяжелом заболевании.'],
  'trud:family': ['Отказ в назначении единого пособия на детей из-за учета доходов.', 'Пособие по уходу за ребенком выплачено не в полном размере.'],
  'trud:pension': ['Не учтен трудовой стаж при назначении пенсии.', 'Перерасчет пенсии не произведен после представления документов.'],
  'trud:tsr': ['Не выдано кресло-коляска по индивидуальной программе реабилитации.', 'Компенсация за самостоятельно приобретенные ТСР не выплачена.'],
  'trud:labor': ['Работодатель не выплатил заработную плату за три месяца.', 'Незаконное увольнение работника с инвалидностью.'],
}
const ORGAN = (v: VedId, t: string, reg: Region, muni: string) => {
  switch (v) {
    case 'mo': return pick([`Военный комиссариат (${reg.name})`, `Войсковая часть ${10000 + Math.floor(rnd() * 89999)}`, 'ФКУ «Единый расчетный центр Минобороны России»', 'Военный госпиталь'])
    case 'prok': return t === 'orphans' ? `Администрация г. ${muni}` : t === 'nonexec' ? `ОСП по г. ${muni}` : `Администрация г. ${muni}`
    case 'mvd': return t === 'ivs' ? `ИВС ОМВД по г. ${muni}` : t === 'migr' ? `Управление по вопросам миграции (${reg.name})` : `ОМВД России по г. ${muni}`
    case 'fsin': return institutions.find((i) => i.r === reg.iso && i.ved === 'fsin')?.name ?? `УФСИН (${reg.name})`
    case 'trud': return t === 'labor' ? 'Работодатель (наименование обезличено)' : pick([`Отделение СФР (${reg.name})`, `Клиентская служба СФР в г. ${muni}`])
  }
}
const VULN_BY: Record<VedId, string> = { mo: 'Участники СВО и их семьи', prok: 'Дети', mvd: 'Пожилые люди', fsin: 'Люди в местах лишения свободы', trud: 'Люди с инвалидностью' }
const DOCS: Record<VedId, string[]> = {
  mo: ['Копия военного билета.pdf', 'Ответ военного комиссариата.pdf', 'Справка о ранении.pdf'],
  prok: ['Решение суда.pdf', 'Переписка с администрацией.pdf', 'Фото дома.jpg'],
  mvd: ['Талон-уведомление.pdf', 'Постановление о приостановлении.pdf'],
  fsin: ['Медицинская выписка.pdf', 'Обращение (рукописное, скан).pdf'],
  trud: ['ИПРА.pdf', 'Решение об отказе.pdf', 'Справка о стаже.pdf'],
}
type Card = Record<string, unknown>
const cards: Card[] = []
const today = new Date(DATA_DATE + 'T12:00:00Z')
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
const iso10 = (d: Date) => d.toISOString().slice(0, 10)
let seq = 1000
const applicantSeq = () => `З-${String(100000 + Math.floor(rnd() * 899999))}`
// выбираем ряды с ненулевыми значениями за последние 10 месяцев пропорционально числу жалоб
const lastMi = MONTHS.length - 1
const pool: { s: Series; mi: number }[] = []
for (const s of series) {
  if (!CONNECTED.has(s.r)) continue
  for (let mi = lastMi - 11; mi <= lastMi; mi++) for (let j = 0; j < s.n[mi]; j++) pool.push({ s, mi })
}
const N_CARDS = 900
for (let k = 0; k < N_CARDS; k++) {
  const { s, mi } = pool[Math.floor(rnd() * pool.length)]
  const reg = REGIONS.find((r) => r.iso === s.r)!
  const ved = VEDS.find((v) => v.id === s.v)!
  const topic = ved.topics.find((t) => t.id === s.t)!
  const q = quality.get(`${s.r}|${s.v}`)!
  const [y, m] = MONTHS[mi].split('-').map(Number)
  const maxDay = MONTHS[mi] === PARTIAL_MONTH ? 22 : 28
  const received = new Date(Date.UTC(y, m - 1, 1 + Math.floor(rnd() * maxDay), 12))
  const sentDays = 2 + Math.floor(rnd() * 6)
  const sent = addDays(received, sentDays)
  const deadline = addDays(sent, LEGAL_DAYS)
  const respDays = Math.max(3, Math.round(q.days * Math.exp(randn() * 0.35)))
  const answeredAt = addDays(sent, respDays)
  const answered = answeredAt <= today
  const overdueDays = answered ? Math.max(0, respDays - LEGAL_DAYS) : Math.max(0, Math.round((today.getTime() - deadline.getTime()) / 86400000))
  const isRepeat = rnd() < q.repeat
  let status: string
  let result = ''
  const muni = pick(MUNI[s.r])
  if (!answered) status = today > deadline ? 'Просрочено ведомством' : 'На рассмотрении в ведомстве'
  else {
    const decided = addDays(answeredAt, 5 + Math.floor(rnd() * 20)) <= today
    if (!decided) { status = 'Ответ получен'; result = 'Ответ ведомства на анализе у Уполномоченного' }
    else if (rnd() < q.restore) { status = 'Право восстановлено'; result = pick(['Право восстановлено по ходатайству Уполномоченного', 'Выплата произведена', 'Нарушение устранено, заявитель уведомлен']) }
    else if (rnd() < 0.5) { status = 'Нарушение не подтверждено'; result = 'По итогам проверки нарушение прав не подтверждено, заявителю даны разъяснения' }
    else { status = 'Разъяснено'; result = 'Заявителю разъяснен порядок обжалования' }
  }
  const pr: PriorityInput = {
    threat: s.v === 'fsin' && s.t === 'fmed' ? 2 + Math.floor(rnd() * 3) : s.v === 'mo' && s.t === 'search' ? 2 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 2),
    vuln: 2 + Math.floor(rnd() * 4), rights: 2 + Math.floor(rnd() * 3), urgency: 1 + Math.floor(rnd() * 4),
    people: rnd() < 0.08 ? 3 + Math.floor(rnd() * 3) : 1, mass: 1 + Math.floor(rnd() * 5), repeat: isRepeat ? 3 + Math.floor(rnd() * 3) : 1,
  }
  const score = priorityScore(pr)
  const num = `${y}-${String(reg.num).padStart(2, '0')}-${String(++seq).padStart(6, '0')}`
  const events: { date: string; title: string; text: string }[] = [
    { date: iso10(received), title: 'Регистрация', text: `Обращение поступило: ${'канал'}` },
    { date: iso10(sent), title: 'Направлено в ведомство', text: `Запрос направлен: ${ved.name}` },
  ]
  if (answered) events.push({ date: iso10(answeredAt), title: 'Ответ ведомства', text: overdueDays > 0 ? `Ответ получен с нарушением срока на ${overdueDays} дн.` : 'Ответ получен в срок' })
  if (result && status !== 'Ответ получен') events.push({ date: iso10(addDays(answeredAt, 10)), title: 'Решение', text: result })
  const channel = pick(CHANNELS)
  events[0].text = `Обращение поступило: ${channel.toLowerCase()}`
  cards.push({
    id: num, status, received: iso10(received), channel,
    addressee: rnd() < 0.55 ? 'Уполномоченный по правам человека в РФ' : 'Уполномоченный по правам человека в субъекте РФ',
    ved: s.v, topic: s.t, organ: ORGAN(s.v, s.t, reg, muni), sub: topic.sub, cat: catOfSub(topic.sub),
    region: reg.iso, muni, deadline: iso10(deadline), respDays: answered ? respDays : null, overdue: overdueDays,
    repeat: isRepeat, type: pick(APPEAL_TYPES.filter((a) => a.code !== 'В04')).code,
    vuln: rnd() < 0.7 ? VULN_BY[s.v] : 'Не относится к уязвимым группам',
    applicant: applicantSeq(), summary: pick(SUMMARY[`${s.v}:${s.t}`]),
    docs: DOCS[s.v].filter(() => rnd() < 0.7), events, result,
    priority: { ...pr, score, cls: priorityClass(score), systemic: isSystemic(pr) },
  })
}
// связанные обращения для повторных: один заявитель, та же тема
for (const c of cards) if (c.repeat) {
  const prev = cards.filter((x) => x !== c && x.region === c.region && x.ved === c.ved && x.topic === c.topic && (x.received as string) < (c.received as string)).slice(0, 2)
  c.related = prev.map((p) => p.id)
  for (const p of prev) p.applicant = c.applicant
}
cards.sort((a, b) => (b.received as string).localeCompare(a.received as string))

// ---------- Запись ----------
const meta = {
  generated: DATA_DATE, seed: SEED, months: MONTHS, partialMonth: PARTIAL_MONTH,
  totals: TOTALS, totalsReal: TOTAL_REAL, source: REPORT_SOURCE,
  note: 'Демонстрационные данные. Реальны только годовые объемы по ведомствам из доклада (см. totalsReal).',
  regions: REGIONS.map((r) => ({ iso: r.iso, status: regionStatus(r.iso) })),
}
fs.writeFileSync(path.join(OUT, 'demo-data.json'), JSON.stringify({ meta, series, extras }))
fs.writeFileSync(path.join(OUT, 'institutions.json'), JSON.stringify(institutions))
fs.writeFileSync(path.join(OUT, 'cases.json'), JSON.stringify(cards))
for (const f of ['demo-data.json', 'institutions.json', 'cases.json']) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024), 'KB')
console.log('subcategories in use:', new Set(VEDS.flatMap((v) => v.topics.map((t) => t.sub))).size, 'of', Object.keys(SUBCATEGORIES).length)
