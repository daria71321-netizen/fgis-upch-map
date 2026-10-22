// Единый справочник: регионы, ведомства, темы, категории прав.
// Его используют карта, фильтры, поиск, карточка охвата и генератор данных (scripts/generate-data.ts).

export type FD = 'ЦФО' | 'СЗФО' | 'ЮФО' | 'СКФО' | 'ПФО' | 'УФО' | 'СФО' | 'ДФО'

export interface Region {
  /** Код субъекта РФ (используется в адресах: #/region/38) */
  num: number
  /** Код в GeoJSON (ISO 3166-2 без префикса RU-, для новых регионов заведен явно) */
  iso: string
  name: string
  fd: FD
  /** Население, тыс. человек (округлено, для новых регионов оценка) */
  pop: number
}

export const REGIONS: Region[] = [
  { num: 1, iso: 'AD', name: 'Республика Адыгея', fd: 'ЮФО', pop: 500 },
  { num: 2, iso: 'BA', name: 'Республика Башкортостан', fd: 'ПФО', pop: 4065 },
  { num: 3, iso: 'BU', name: 'Республика Бурятия', fd: 'ДФО', pop: 970 },
  { num: 4, iso: 'AL', name: 'Республика Алтай', fd: 'СФО', pop: 210 },
  { num: 5, iso: 'DA', name: 'Республика Дагестан', fd: 'СКФО', pop: 3200 },
  { num: 6, iso: 'IN', name: 'Республика Ингушетия', fd: 'СКФО', pop: 520 },
  { num: 7, iso: 'KB', name: 'Кабардино-Балкарская Республика', fd: 'СКФО', pop: 900 },
  { num: 8, iso: 'KL', name: 'Республика Калмыкия', fd: 'ЮФО', pop: 260 },
  { num: 9, iso: 'KC', name: 'Карачаево-Черкесская Республика', fd: 'СКФО', pop: 470 },
  { num: 10, iso: 'KR', name: 'Республика Карелия', fd: 'СЗФО', pop: 520 },
  { num: 11, iso: 'KO', name: 'Республика Коми', fd: 'СЗФО', pop: 720 },
  { num: 12, iso: 'ME', name: 'Республика Марий Эл', fd: 'ПФО', pop: 670 },
  { num: 13, iso: 'MO', name: 'Республика Мордовия', fd: 'ПФО', pop: 760 },
  { num: 14, iso: 'SA', name: 'Республика Саха (Якутия)', fd: 'ДФО', pop: 1000 },
  { num: 15, iso: 'SE', name: 'Республика Северная Осетия - Алания', fd: 'СКФО', pop: 680 },
  { num: 16, iso: 'TA', name: 'Республика Татарстан', fd: 'ПФО', pop: 4000 },
  { num: 17, iso: 'TY', name: 'Республика Тыва', fd: 'СФО', pop: 340 },
  { num: 18, iso: 'UD', name: 'Удмуртская Республика', fd: 'ПФО', pop: 1440 },
  { num: 19, iso: 'KK', name: 'Республика Хакасия', fd: 'СФО', pop: 530 },
  { num: 20, iso: 'CE', name: 'Чеченская Республика', fd: 'СКФО', pop: 1550 },
  { num: 21, iso: 'CU', name: 'Чувашская Республика', fd: 'ПФО', pop: 1180 },
  { num: 22, iso: 'ALT', name: 'Алтайский край', fd: 'СФО', pop: 2120 },
  { num: 23, iso: 'KDA', name: 'Краснодарский край', fd: 'ЮФО', pop: 5840 },
  { num: 24, iso: 'KYA', name: 'Красноярский край', fd: 'СФО', pop: 2840 },
  { num: 25, iso: 'PRI', name: 'Приморский край', fd: 'ДФО', pop: 1820 },
  { num: 26, iso: 'STA', name: 'Ставропольский край', fd: 'СКФО', pop: 2860 },
  { num: 27, iso: 'KHA', name: 'Хабаровский край', fd: 'ДФО', pop: 1280 },
  { num: 28, iso: 'AMU', name: 'Амурская область', fd: 'ДФО', pop: 750 },
  { num: 29, iso: 'ARK', name: 'Архангельская область', fd: 'СЗФО', pop: 960 },
  { num: 30, iso: 'AST', name: 'Астраханская область', fd: 'ЮФО', pop: 950 },
  { num: 31, iso: 'BEL', name: 'Белгородская область', fd: 'ЦФО', pop: 1520 },
  { num: 32, iso: 'BRY', name: 'Брянская область', fd: 'ЦФО', pop: 1150 },
  { num: 33, iso: 'VLA', name: 'Владимирская область', fd: 'ЦФО', pop: 1330 },
  { num: 34, iso: 'VGG', name: 'Волгоградская область', fd: 'ЮФО', pop: 2470 },
  { num: 35, iso: 'VLG', name: 'Вологодская область', fd: 'СЗФО', pop: 1110 },
  { num: 36, iso: 'VOR', name: 'Воронежская область', fd: 'ЦФО', pop: 2280 },
  { num: 37, iso: 'IVA', name: 'Ивановская область', fd: 'ЦФО', pop: 910 },
  { num: 38, iso: 'IRK', name: 'Иркутская область', fd: 'СФО', pop: 2340 },
  { num: 39, iso: 'KGD', name: 'Калининградская область', fd: 'СЗФО', pop: 1030 },
  { num: 40, iso: 'KLU', name: 'Калужская область', fd: 'ЦФО', pop: 1000 },
  { num: 41, iso: 'KAM', name: 'Камчатский край', fd: 'ДФО', pop: 290 },
  { num: 42, iso: 'KEM', name: 'Кемеровская область', fd: 'СФО', pop: 2550 },
  { num: 43, iso: 'KIR', name: 'Кировская область', fd: 'ПФО', pop: 1120 },
  { num: 44, iso: 'KOS', name: 'Костромская область', fd: 'ЦФО', pop: 570 },
  { num: 45, iso: 'KGN', name: 'Курганская область', fd: 'УФО', pop: 760 },
  { num: 46, iso: 'KRS', name: 'Курская область', fd: 'ЦФО', pop: 1080 },
  { num: 47, iso: 'LEN', name: 'Ленинградская область', fd: 'СЗФО', pop: 2030 },
  { num: 48, iso: 'LIP', name: 'Липецкая область', fd: 'ЦФО', pop: 1120 },
  { num: 49, iso: 'MAG', name: 'Магаданская область', fd: 'ДФО', pop: 135 },
  { num: 50, iso: 'MOS', name: 'Московская область', fd: 'ЦФО', pop: 8650 },
  { num: 51, iso: 'MUR', name: 'Мурманская область', fd: 'СЗФО', pop: 660 },
  { num: 52, iso: 'NIZ', name: 'Нижегородская область', fd: 'ПФО', pop: 3080 },
  { num: 53, iso: 'NGR', name: 'Новгородская область', fd: 'СЗФО', pop: 580 },
  { num: 54, iso: 'NVS', name: 'Новосибирская область', fd: 'СФО', pop: 2780 },
  { num: 55, iso: 'OMS', name: 'Омская область', fd: 'СФО', pop: 1830 },
  { num: 56, iso: 'ORE', name: 'Оренбургская область', fd: 'ПФО', pop: 1840 },
  { num: 57, iso: 'ORL', name: 'Орловская область', fd: 'ЦФО', pop: 690 },
  { num: 58, iso: 'PNZ', name: 'Пензенская область', fd: 'ПФО', pop: 1240 },
  { num: 59, iso: 'PER', name: 'Пермский край', fd: 'ПФО', pop: 2500 },
  { num: 60, iso: 'PSK', name: 'Псковская область', fd: 'СЗФО', pop: 580 },
  { num: 61, iso: 'ROS', name: 'Ростовская область', fd: 'ЮФО', pop: 4150 },
  { num: 62, iso: 'RYA', name: 'Рязанская область', fd: 'ЦФО', pop: 1090 },
  { num: 63, iso: 'SAM', name: 'Самарская область', fd: 'ПФО', pop: 3150 },
  { num: 64, iso: 'SAR', name: 'Саратовская область', fd: 'ПФО', pop: 2400 },
  { num: 65, iso: 'SAK', name: 'Сахалинская область', fd: 'ДФО', pop: 460 },
  { num: 66, iso: 'SVE', name: 'Свердловская область', fd: 'УФО', pop: 4240 },
  { num: 67, iso: 'SMO', name: 'Смоленская область', fd: 'ЦФО', pop: 880 },
  { num: 68, iso: 'TAM', name: 'Тамбовская область', fd: 'ЦФО', pop: 960 },
  { num: 69, iso: 'TVE', name: 'Тверская область', fd: 'ЦФО', pop: 1210 },
  { num: 70, iso: 'TOM', name: 'Томская область', fd: 'СФО', pop: 1050 },
  { num: 71, iso: 'TUL', name: 'Тульская область', fd: 'ЦФО', pop: 1500 },
  { num: 72, iso: 'TYU', name: 'Тюменская область', fd: 'УФО', pop: 1600 },
  { num: 73, iso: 'ULY', name: 'Ульяновская область', fd: 'ПФО', pop: 1190 },
  { num: 74, iso: 'CHE', name: 'Челябинская область', fd: 'УФО', pop: 3400 },
  { num: 75, iso: 'ZAB', name: 'Забайкальский край', fd: 'ДФО', pop: 990 },
  { num: 76, iso: 'YAR', name: 'Ярославская область', fd: 'ЦФО', pop: 1180 },
  { num: 77, iso: 'MOW', name: 'Москва', fd: 'ЦФО', pop: 13150 },
  { num: 78, iso: 'SPE', name: 'Санкт-Петербург', fd: 'СЗФО', pop: 5600 },
  { num: 79, iso: 'YEV', name: 'Еврейская автономная область', fd: 'ДФО', pop: 150 },
  { num: 83, iso: 'NEN', name: 'Ненецкий автономный округ', fd: 'СЗФО', pop: 41 },
  { num: 86, iso: 'KHM', name: 'Ханты-Мансийский автономный округ - Югра', fd: 'УФО', pop: 1730 },
  { num: 87, iso: 'CHU', name: 'Чукотский автономный округ', fd: 'ДФО', pop: 48 },
  { num: 89, iso: 'YAN', name: 'Ямало-Ненецкий автономный округ', fd: 'УФО', pop: 550 },
  { num: 90, iso: 'ZAP', name: 'Запорожская область', fd: 'ЮФО', pop: 510 },
  { num: 91, iso: 'CR', name: 'Республика Крым', fd: 'ЮФО', pop: 1910 },
  { num: 92, iso: 'SEV', name: 'Севастополь', fd: 'ЮФО', pop: 560 },
  { num: 93, iso: 'DPR', name: 'Донецкая Народная Республика', fd: 'ЮФО', pop: 2270 },
  { num: 94, iso: 'LPR', name: 'Луганская Народная Республика', fd: 'ЮФО', pop: 1370 },
  { num: 95, iso: 'KHE', name: 'Херсонская область', fd: 'ЮФО', pop: 330 },
]

export const TOTAL_REGIONS = REGIONS.length // 89

/** Демо: регионы, подключенные к ФГИС УПЧ (26). Остальные показываются как «Оценка». */
export const CONNECTED = new Set([
  'MOW', 'MOS', 'SPE', 'NIZ', 'SVE', 'SAR', 'TUL', 'KDA', 'BU', 'TA', 'BA', 'SAM', 'NVS',
  'ROS', 'VOR', 'BEL', 'PER', 'CHE', 'IRK', 'KYA', 'PRI', 'KHA', 'ZAB', 'KLU', 'TYU', 'DPR',
])
/** Демо: регионы без данных совсем */
export const NODATA = new Set(['NEN', 'IN', 'YEV', 'KHE'])

export type RegionStatus = 'connected' | 'estimate' | 'nodata'
export const regionStatus = (iso: string): RegionStatus =>
  CONNECTED.has(iso) ? 'connected' : NODATA.has(iso) ? 'nodata' : 'estimate'

export const regionByNum = new Map(REGIONS.map((r) => [r.num, r]))
export const regionByIso = new Map(REGIONS.map((r) => [r.iso, r]))

/** Категории прав по классификации команды (документ «Классификация») */
export const CATEGORIES = [
  { code: '01', name: 'Личные права' },
  { code: '02', name: 'Экономические права' },
  { code: '03', name: 'Социальные права' },
  { code: '04', name: 'Культурные права' },
  { code: '05', name: 'Политические права' },
  { code: '06', name: 'Права в правоохранительной и судебной деятельности' },
  { code: '07', name: 'Иное' },
] as const
export type CategoryCode = (typeof CATEGORIES)[number]['code']

export const SUBCATEGORIES: Record<string, string> = {
  '01.1': 'Право на жизнь и личную безопасность',
  '01.2': 'Защита достоинства и от жестокого обращения',
  '01.3': 'Неприкосновенность частной жизни и персональных данных',
  '01.4': 'Свобода передвижения и иные личные свободы',
  '02.1': 'Трудовые права и занятость',
  '02.2': 'Имущественные права и собственность',
  '02.3': 'Предпринимательская деятельность',
  '02.4': 'Потребительские и финансовые права',
  '03.1': 'Социальное обеспечение и выплаты',
  '03.2': 'Жилищные права',
  '03.3': 'Здравоохранение и медицинская помощь',
  '03.4': 'Социальные услуги, ЖКХ и доступность среды',
  '06.1': 'Доступ к правосудию и судебная защита',
  '06.2': 'Действия полиции и иных правоохранительных органов',
  '06.3': 'Права участников уголовного судопроизводства',
  '06.4': 'Права лиц в местах принудительного содержания',
}

export type VedId = 'mo' | 'prok' | 'mvd' | 'fsin' | 'trud'

export interface Topic {
  id: string
  name: string
  sub: string // подкатегория права
}

export interface Ved {
  id: VedId
  name: string
  short: string
  layer: string
  /** Реальные объемы по докладу Уполномоченного за 2025 год (с. 559); null = нет в докладе */
  report: { y2023: number | null; y2025: number; note: string }
  topics: Topic[]
}

export const VEDS: Ved[] = [
  {
    id: 'mo', name: 'Минобороны России', short: 'Минобороны', layer: 'Участники СВО и их семьи',
    report: { y2023: 14432, y2025: 20283, note: '20 283 в 2025 году, 14 432 в 2023 году (рост на 40%)' },
    topics: [
      { id: 'search', name: 'Розыск и плен', sub: '01.1' },
      { id: 'pay', name: 'Выплаты и компенсации', sub: '03.1' },
      { id: 'med', name: 'Медпомощь', sub: '03.3' },
      { id: 'dismiss', name: 'Увольнение', sub: '02.1' },
    ],
  },
  {
    id: 'prok', name: 'Органы прокуратуры', short: 'Прокуратура', layer: 'Повторяющиеся нарушения',
    report: { y2023: null, y2025: 8347, note: '8 347 в 2025 году' },
    topics: [
      { id: 'delay', name: 'Волокита и бездействие', sub: '06.1' },
      { id: 'nonexec', name: 'Неисполнение решений', sub: '06.1' },
      { id: 'orphans', name: 'Жилье детям-сиротам', sub: '03.2' },
    ],
  },
  {
    id: 'mvd', name: 'МВД России', short: 'МВД', layer: 'Учреждения МВД (ИВС, ЦВСИГ)',
    report: { y2023: null, y2025: 1283, note: '1 283 в 2025 году' },
    topics: [
      { id: 'invest', name: 'Волокита расследования', sub: '06.3' },
      { id: 'fraud', name: 'Мошенничество', sub: '02.4' },
      { id: 'ivs', name: 'Условия в ИВС и ЦВСИГ', sub: '06.4' },
      { id: 'migr', name: 'Миграция', sub: '01.4' },
    ],
  },
  {
    id: 'fsin', name: 'ФСИН России', short: 'ФСИН', layer: 'Колонии и СИЗО',
    report: { y2023: 1441, y2025: 889, note: '889 в 2025 году, 1 441 в 2023 году' },
    topics: [
      { id: 'fmed', name: 'Медпомощь', sub: '03.3' },
      { id: 'cond', name: 'Условия содержания', sub: '06.4' },
      { id: 'release', name: 'Освобождение по болезни', sub: '06.4' },
    ],
  },
  {
    id: 'trud', name: 'Минтруд России и СФР', short: 'Минтруд и СФР', layer: 'Социальная поддержка',
    report: { y2023: null, y2025: 140, note: '140 в Минтруд в 2025 году; обращения в отделения СФР демонстрационные' },
    topics: [
      { id: 'family', name: 'Пособия семьям с детьми', sub: '03.1' },
      { id: 'pension', name: 'Пенсии', sub: '03.1' },
      { id: 'tsr', name: 'Средства реабилитации (ТСР)', sub: '03.4' },
      { id: 'labor', name: 'Трудовые споры', sub: '02.1' },
    ],
  },
]

export const vedById = new Map(VEDS.map((v) => [v.id, v]))

/** Ведомства, которые подключаются позже (неактивны в списке) */
export const VEDS_LATER = [
  'Суды', 'ФССП России', 'СК России', 'Минюст России', 'Минздрав России', 'МЧС России',
  'Минстрой России', 'Минпросвещения России', 'Минцифры России',
]

export const REPORT_SOURCE = 'Доклад Уполномоченного по правам человека в РФ за 2025 год, с. 558-559'

/** Дата «сегодня» демонстрационного набора */
export const DATA_DATE = '2026-10-22'
export const FIRST_MONTH = { y: 2023, m: 1 }
export const MONTHS = (() => {
  const out: string[] = []
  for (let y = 2023; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
    if (y === 2026 && m > 10) break
    out.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return out
})()
/** Октябрь 2026 неполный (по 22 число) */
export const PARTIAL_MONTH = '2026-10'

export const catOfSub = (sub: string) => sub.slice(0, 2) as CategoryCode
