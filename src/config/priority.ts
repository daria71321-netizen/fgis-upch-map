// Приоритет обращения по модели команды (документ «Ранжирование»).
// Балл = 10*Угроза + 3*Уязвимость + 2*Права + 2*Срочность + Число + Массовость + Повторность,
// каждая оценка от 1 до 5, итог от 20 до 100.

export interface PriorityInput {
  threat: number
  vuln: number
  rights: number
  urgency: number
  people: number
  mass: number
  repeat: number
}

export const PRIORITY_CRITERIA: { key: keyof PriorityInput; name: string; w: number }[] = [
  { key: 'threat', name: 'Угроза жизни и здоровью', w: 10 },
  { key: 'vuln', name: 'Уязвимость заявителя', w: 3 },
  { key: 'rights', name: 'Влияние на основные права', w: 2 },
  { key: 'urgency', name: 'Срочность ситуации', w: 2 },
  { key: 'people', name: 'Число пострадавших', w: 1 },
  { key: 'mass', name: 'Массовость проблемы в регионе', w: 1 },
  { key: 'repeat', name: 'Повторность обращения', w: 1 },
]

export type PriorityClass = 'Критический' | 'Высокий' | 'Средний' | 'Низкий'

export function priorityScore(p: PriorityInput): number {
  let s = 0
  for (const c of PRIORITY_CRITERIA) s += c.w * p[c.key]
  // Правило 1: эскалация угрозы
  if (p.threat === 5) s = Math.max(s, 85)
  else if (p.threat === 4) s = Math.max(s, 75)
  return s
}

export function priorityClass(score: number): PriorityClass {
  if (score >= 80) return 'Критический'
  if (score >= 60) return 'Высокий'
  if (score >= 35) return 'Средний'
  return 'Низкий'
}

/** Правило 4: системная проблема при массовости 4-5 и влиянии на права 3-5 */
export const isSystemic = (p: PriorityInput) => p.mass >= 4 && p.rights >= 3

export const APPEAL_TYPES = [
  { code: 'В01', name: 'Предложение' },
  { code: 'В02', name: 'Заявление' },
  { code: 'В03', name: 'Жалоба' },
  { code: 'В04', name: 'Консультация' },
] as const

export const VULN_GROUPS = [
  'Не относится к уязвимым группам', 'Дети', 'Люди с инвалидностью', 'Пожилые люди',
  'Люди в местах лишения свободы', 'Участники СВО и их семьи',
  'Представители коренных малочисленных народов', 'Иные уязвимые группы',
] as const
