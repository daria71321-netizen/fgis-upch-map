// Правила формирования рекомендаций. Рекомендации вычисляются из демонстрационных показателей
// и являются основанием для дополнительной проверки и анализа, а не выводом о нарушении прав.
//
// Правила (описаны также в README):
//  R1 Рост по теме: динамика темы к прошлому году >= +40% (класс 5) при 10+ жалобах -> высокий;
//     от +15% до +40% (класс 4) при 15+ жалобах -> средний.
//  R2 Срок ответа ведомства: класс 4 (36-45 дней) -> средний, класс 5 (больше 45) -> высокий.
//     Для Минтруда и СФР адресат: губернатор (организация работы отделения СФР в регионе).
//  R3 Доля восстановленных прав: класс 4-5 (меньше 30%) при 10+ завершенных с нарушением -> средний.
//  R4 Повторные обращения: класс 4-5 (15% и больше) при 20+ жалобах -> средний (признак формальных ответов).
//  R5 Прокуратура: один тип жалоб на один орган 5 и более раз за квартал -> высокий.
//  R6 МВД, ФСИН: учреждение с 10+ жалобами за последние 6 месяцев периода -> средний (проверка с ОНК).
//  R7 Жалоб на 10 тыс. жителей в 2 и более раза выше среднего по России -> информационный (анализ причин).
//  R8 Регион не подключен к ФГИС УПЧ или нет данных -> информационный.
import { VEDS, vedById, regionByIso, regionStatus, CONNECTED, TOTAL_REGIONS } from '../config/reference'
import type { VedId } from '../config/reference'
import { classOf, REPEAT_CLUSTER_MIN } from '../config/thresholds'
import { aggregate, avgDays, dynPct, restoredPct, repeatPct, per10k, popOf, POP_WITH_DATA, regionStats } from '../data/aggregate'
import type { DemoData, Institution } from '../data/types'
import type { VedFilter } from '../state/filters'
import { periodRange } from '../state/filters'
import { MONTHS } from '../config/reference'
import { fmtInt, fmtNum, fmtPct, fmtSignedPct } from '../lib/format'

export type Level = 'high' | 'medium' | 'info'
export interface Rec {
  id: string
  level: Level
  title: string
  addressee: string
  indicator: string
  why: string
  action: string
  ved?: VedId
  topic?: string
  weight: number
}

const ACTIONS: Record<string, string> = {
  'mo:search': 'Рекомендуется сверить списки разыскиваемых с Минобороны и ускорить ответы по розыску через межведомственную рабочую группу.',
  'mo:pay': 'Рекомендуется проверить порядок начисления выплат в региональных военных комиссариатах и сроки рассмотрения заявлений.',
  'mo:med': 'Рекомендуется проверить доступность долечивания и медицинской реабилитации военнослужащих в регионе.',
  'mo:dismiss': 'Рекомендуется проверить сроки рассмотрения рапортов об увольнении в воинских частях.',
  'prok:delay': 'Рекомендуется включить органы, на которые поступают жалобы, в план прокурорских проверок.',
  'prok:nonexec': 'Рекомендуется проверить исполнение судебных решений службой судебных приставов и органами власти.',
  'prok:orphans': 'Рекомендуется проверить очередь на жилье детей-сирот и исполнение судебных решений о предоставлении жилья.',
  'mvd:invest': 'Рекомендуется проверить обоснованность приостановления уголовных дел и сроки расследования.',
  'mvd:fraud': 'Рекомендуется проверить сроки рассмотрения заявлений о мошенничестве и усилить профилактику среди пожилых граждан.',
  'mvd:ivs': 'Рекомендуется проверить условия содержания в ИВС совместно с ОНК.',
  'mvd:migr': 'Рекомендуется проверить сроки оформления документов и обоснованность помещения в ЦВСИГ.',
  'fsin:fmed': 'Рекомендуется проверка медицинских частей учреждений совместно с ОНК.',
  'fsin:cond': 'Рекомендуется проверка условий содержания совместно с ОНК.',
  'fsin:release': 'Рекомендуется проверить своевременность направления осужденных на медицинское освидетельствование.',
  'trud:family': 'Рекомендуется проверить порядок назначения единого пособия в отделении СФР.',
  'trud:pension': 'Рекомендуется проверить порядок учета стажа и сроки перерасчета пенсий.',
  'trud:tsr': 'Рекомендуется проверить сроки обеспечения техническими средствами реабилитации и выплаты компенсаций.',
  'trud:labor': 'Рекомендуется передать сведения в Государственную инспекцию труда для проверки работодателей.',
}

const LEVEL_ORDER: Record<Level, number> = { high: 0, medium: 1, info: 2 }
export const LEVEL_LABEL: Record<Level, string> = { high: 'Высокий', medium: 'Средний', info: 'Информационный' }

function sortRecs(r: Rec[]) {
  return r.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.weight - a.weight)
}

export function regionRecs(data: DemoData, institutions: Institution[], iso: string, period: string, vedF: VedFilter): Rec[] {
  const status = regionStatus(iso)
  const reg = regionByIso.get(iso)!
  const out: Rec[] = []
  if (status === 'nodata') {
    return [{ id: 'nodata', level: 'info', title: 'Нет данных по региону', addressee: 'Губернатор', indicator: 'Данные в ФГИС УПЧ отсутствуют', why: 'Отсутствие данных не означает отсутствия нарушений.', action: 'Рекомендуется подключение региона к ФГИС УПЧ для учета обращений.', weight: 0 }]
  }
  const veds = vedF === 'all' ? VEDS : [vedById.get(vedF)!]
  const r = periodRange(period)!
  for (const v of veds) {
    const regA = aggregate(data, { ved: v.id, region: iso }, period)
    const natA = aggregate(data, { ved: v.id }, period)
    // R1
    for (const t of v.topics) {
      const a = aggregate(data, { ved: v.id, topic: t.id, region: iso }, period)
      const d = dynPct(a)
      if (d === null) continue
      const cls = classOf('dyn', d)
      if ((cls === 5 && a.n >= 10) || (cls === 4 && a.n >= 15)) {
        out.push({
          id: `dyn-${v.id}-${t.id}`, level: cls === 5 ? 'high' : 'medium', ved: v.id, topic: t.id,
          title: `Рост жалоб по теме «${t.name}»`, addressee: v.name,
          indicator: `${fmtInt(a.n)} жалоб, ${fmtSignedPct(d)} к прошлому году, класс ${cls}`,
          why: `Число жалоб${v.id === 'mo' ? ' участников СВО и их семей' : ''} по теме «${t.name}» выросло на ${fmtNum(d, 0)}% к тому же периоду прошлого года${status === 'estimate' ? ' (оценка, регион не подключен)' : ''}.`,
          action: ACTIONS[`${v.id}:${t.id}`], weight: d,
        })
      }
    }
    if (status === 'connected') {
      // R2
      const days = avgDays(regA), nd = avgDays(natA)
      if (days !== null && regA.ans >= 5) {
        const cls = classOf('days', Math.round(days))
        if (cls >= 4) out.push({
          id: `days-${v.id}`, level: cls === 5 ? 'high' : 'medium', ved: v.id,
          title: `Долгий срок ответа: ${v.short}`, addressee: v.id === 'trud' ? 'Губернатор' : v.name,
          indicator: `${Math.round(days)} дн. при среднем по России ${Math.round(nd ?? 0)} дн., класс ${cls}`,
          why: `Срок ответа ${v.id === 'trud' ? 'отделения СФР' : 'ведомства'} на запросы Уполномоченного в регионе ${Math.round(days)} дней при среднем по России ${Math.round(nd ?? 0)} дня. Граждане дольше ждут решения.`,
          action: v.id === 'trud' ? 'Рекомендуется обсудить с отделением СФР распределение нагрузки и контроль сроков.' : 'Рекомендуется проверить организацию рассмотрения запросов Уполномоченного и контроль сроков.',
          weight: days,
        })
      }
      // R3
      const rp = restoredPct(regA), nr = restoredPct(natA)
      if (rp !== null && regA.viol >= 10 && classOf('restored', rp) >= 4) out.push({
        id: `rest-${v.id}`, level: 'medium', ved: v.id,
        title: `Низкая доля восстановленных прав: ${v.short}`, addressee: v.name,
        indicator: `${fmtPct(rp)} при среднем по России ${fmtPct(nr)}, класс ${classOf('restored', rp)}`,
        why: 'Нарушение подтверждено, но право восстановлено менее чем в трети случаев.',
        action: 'Рекомендуется проанализировать завершенные случаи без восстановления права и причины отказов.', weight: 100 - rp,
      })
      // R4
      const rep = repeatPct(regA), nrep = repeatPct(natA)
      if (rep !== null && regA.nc >= 20 && classOf('repeat', rep) >= 4) out.push({
        id: `rep-${v.id}`, level: 'medium', ved: v.id,
        title: `Много повторных обращений: ${v.short}`, addressee: v.name,
        indicator: `${fmtPct(rep)} повторных при среднем по России ${fmtPct(nrep)}`,
        why: 'Граждане обращаются повторно по тем же проблемам: это признак формальных ответов.',
        action: 'Рекомендуется выборочно проверить качество ответов по повторным обращениям.', weight: rep,
      })
      // R5
      if (v.id === 'prok') {
        const ex = data.extras[iso]
        const cl = ex?.prok.clusters.filter((c) => MONTHS.indexOf(c.q) >= r[0] - 2 && MONTHS.indexOf(c.q) <= r[1] && c.count >= REPEAT_CLUSTER_MIN) ?? []
        const top = [...cl].sort((a, b) => b.count - a.count)[0]
        if (top) {
          const t = v.topics.find((x) => x.id === top.topic)!
          out.push({
            id: `prok-${top.organ}`, level: 'high', ved: 'prok', topic: top.topic,
            title: `Повторяющиеся нарушения: ${t.name.toLowerCase()}`, addressee: v.name,
            indicator: `${top.count} жалоб за квартал на один орган (${top.organ}); всего повторов за период: ${cl.length}`,
            why: `Жалобы по теме «${t.name}» повторяются ${top.count} раз за квартал в отношении одного органа.`,
            action: 'Рекомендуется включить орган в план проверок.', weight: top.count,
          })
        }
      }
      // R6
      if (v.id === 'mvd' || v.id === 'fsin') {
        const from = Math.max(r[0], r[1] - 5)
        for (const inst of institutions.filter((i) => i.r === iso && i.ved === v.id)) {
          let n = 0
          for (let k = from; k <= r[1]; k++) n += inst.m[k]
          if (n >= 10) {
            const ti = inst.topics.indexOf(Math.max(...inst.topics))
            out.push({
              id: `inst-${inst.id}`, level: 'medium', ved: v.id,
              title: `Жалобы на учреждение: ${inst.type}`, addressee: v.name,
              indicator: `${n} жалоб за последние ${r[1] - from + 1} мес., основная тема «${v.topics[ti]?.name}»`,
              why: `В учреждении «${inst.name}» ${n} жалоб за полгода.`,
              action: 'Рекомендуется проверка учреждения совместно с ОНК.', weight: n,
            })
          }
        }
      }
    }
    // R7
    const rate = per10k(regA.n, popOf(iso)), nat = per10k(natA.n, POP_WITH_DATA)
    if (nat > 0 && rate / nat >= 2 && regA.n >= 20) out.push({
      id: `rate-${v.id}`, level: 'info', ved: v.id,
      title: `Высокая обращаемость: ${v.short}`, addressee: v.id === 'mo' || v.id === 'trud' ? `${v.short} и губернатор` : v.name,
      indicator: `${fmtNum(rate, 2)} на 10 тыс. жителей, ${fmtNum(rate / nat, 1)}× к среднему по России`,
      why: 'Высокое число обращений не означает плохую работу: оно может быть связано с доступностью института Уполномоченного и составом населения.',
      action: 'Рекомендуется проанализировать причины и структуру обращений.', weight: rate / nat,
    })
  }
  if (status === 'estimate') out.push({
    id: 'estimate', level: 'info', title: 'Регион не подключен к ФГИС УПЧ', addressee: 'Губернатор',
    indicator: 'Показатели построены по данным доклада (оценка)', why: `Для ${reg.name.startsWith('Республика') ? 'республики' : 'региона'} нельзя рассчитать сроки ответа и долю восстановленных прав.`,
    action: 'Рекомендуется подключение к ФГИС УПЧ для точного учета.', weight: 0,
  })
  return sortRecs(out)
}

/** Рекомендации по ведомству на уровне России: группы регионов по фиксированным порогам */
export function nationalRecs(data: DemoData, period: string, vedF: VedFilter, topic: string | null): Rec[] {
  const out: Rec[] = []
  const veds = vedF === 'all' ? VEDS : [vedById.get(vedF)!]
  for (const v of veds) {
    const st = regionStats(data, { ved: v.id, topic: vedF === 'all' ? null : topic }, period)
    const list = [...st.values()]
    const name = (isos: string[]) => isos.slice(0, 4).map((i) => regionByIso.get(i)!.name).join(', ') + (isos.length > 4 ? ` и еще ${isos.length - 4}` : '')
    const growth = list.filter((s) => s.cls.dyn === 5 && s.agg.n >= 20).sort((a, b) => b.values.dyn! - a.values.dyn!)
    if (growth.length) out.push({
      id: `n-dyn-${v.id}`, level: 'high', ved: v.id,
      title: `Рост жалоб на 40% и больше в ${growth.length} ${growth.length === 1 ? 'регионе' : 'регионах'}`, addressee: v.name,
      indicator: name(growth.map((s) => s.iso)),
      why: 'Резкий рост к прошлому году при 20 и более жалобах.', action: 'Рекомендуется запросить у территориальных органов анализ причин роста и план мер.', weight: growth.length,
    })
    const slow = list.filter((s) => (s.cls.days ?? 0) >= 4 && s.agg.ans >= 5).sort((a, b) => b.values.days! - a.values.days!)
    if (slow.length) out.push({
      id: `n-days-${v.id}`, level: slow.some((s) => s.cls.days === 5) ? 'high' : 'medium', ved: v.id,
      title: `Срок ответа больше 35 дней в ${slow.length} ${slow.length === 1 ? 'регионе' : 'регионах'}`, addressee: v.name,
      indicator: name(slow.map((s) => s.iso)), why: 'Законный срок ответа 30 дней.', action: 'Рекомендуется усилить контроль сроков ответа на запросы Уполномоченного.', weight: slow.length,
    })
    const low = list.filter((s) => (s.cls.restored ?? 0) >= 4 && s.agg.viol >= 10)
    if (low.length) out.push({
      id: `n-rest-${v.id}`, level: 'medium', ved: v.id, title: `Право восстановлено реже чем в 30% случаев в ${low.length} ${low.length === 1 ? 'регионе' : 'регионах'}`, addressee: v.name,
      indicator: name(low.map((s) => s.iso)), why: 'Нарушение подтверждено, но не устранено.', action: 'Рекомендуется проанализировать причины отказов в восстановлении прав.', weight: low.length,
    })
  }
  out.push({ id: 'n-cover', level: 'info', title: `${TOTAL_REGIONS - CONNECTED.size} субъектов не подключены к ФГИС УПЧ`, addressee: 'Губернаторы', indicator: 'Показатели по ним построены как оценка', why: 'Без подключения нельзя считать сроки ответа и долю восстановленных прав.', action: 'Рекомендуется подключение регионов для точного учета.', weight: 0 })
  return sortRecs(out)
}
