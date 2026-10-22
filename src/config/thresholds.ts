// Фиксированные пороги цветовых классов карты.
// Одинаковы для всех ведомств и не зависят от текущей выборки:
// цвет сегодня и через месяц означает одно и то же. Класс 1 = спокойно, класс 5 = требует внимания.

export type MetricId = 'rate' | 'dyn' | 'days' | 'restored' | 'repeat'

export interface MetricDef {
  id: MetricId
  name: string
  short: string
  unit: string
  /** Границы между классами (4 числа). Для обычной шкалы значение >= границы i дает класс i+2. */
  bounds: [number, number, number, number]
  /** true: чем больше значение, тем лучше (доля восстановленных прав) */
  inverse?: boolean
  labels: [string, string, string, string, string]
}

export const METRICS: MetricDef[] = [
  {
    id: 'rate', name: 'Жалоб на 10 тыс. жителей, к среднему по России', short: 'На 10 тыс. жителей',
    unit: '× к России', bounds: [0.7, 1, 1.3, 2],
    labels: ['меньше 0,7×', '0,7-1×', '1-1,3×', '1,3-2×', '2× и больше'],
  },
  {
    id: 'dyn', name: 'Динамика к прошлому году', short: 'Динамика', unit: '%',
    bounds: [-10, 0, 15, 40],
    labels: ['меньше -10%', 'от -10 до 0%', 'от 0 до +15%', 'от +15 до +40%', '+40% и больше'],
  },
  {
    id: 'days', name: 'Срок ответа ведомства на запрос Уполномоченного', short: 'Срок ответа', unit: 'дн.',
    // до 15 / 16-25 / 26-35 / 36-45 / больше 45 (средние сроки округляются до целых дней)
    bounds: [15.5, 25.5, 35.5, 45.5],
    labels: ['до 15 дней', '16-25 дней', '26-35 дней', '36-45 дней', 'больше 45 дней'],
  },
  {
    id: 'restored', name: 'Доля восстановленных прав', short: 'Восстановлено прав', unit: '%',
    bounds: [60, 45, 30, 20], inverse: true,
    labels: ['60% и больше', '45-60%', '30-45%', '20-30%', 'меньше 20%'],
  },
  {
    id: 'repeat', name: 'Повторные обращения', short: 'Повторные', unit: '%',
    bounds: [5, 10, 15, 25],
    labels: ['меньше 5%', '5-10%', '10-15%', '15-25%', '25% и больше'],
  },
]

export const metricById = new Map(METRICS.map((m) => [m.id, m]))

/** Класс 1..5 по фиксированным порогам */
export function classOf(metric: MetricId, value: number): 1 | 2 | 3 | 4 | 5 {
  const m = metricById.get(metric)!
  const b = m.bounds
  if (m.inverse) {
    if (value >= b[0]) return 1
    if (value >= b[1]) return 2
    if (value >= b[2]) return 3
    if (value >= b[3]) return 4
    return 5
  }
  if (value < b[0]) return 1
  if (value < b[1]) return 2
  if (value < b[2]) return 3
  if (value < b[3]) return 4
  return 5
}

/** Учреждение показывается точкой только при 5 и более жалобах (чтобы точка не выдавала заявителя) */
export const INSTITUTION_MIN = 5
/** Повторяющееся нарушение: один тип жалоб на один орган 5 и более раз за квартал */
export const REPEAT_CLUSTER_MIN = 5
/** Законный срок ответа, дней (59-ФЗ) */
export const LEGAL_DAYS = 30
