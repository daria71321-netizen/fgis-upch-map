import { useNavigate } from 'react-router-dom'
import { MapPin, ArrowRight } from 'lucide-react'
import { regionByIso, vedById, CATEGORIES } from '../config/reference'
import type { VedId, CategoryCode } from '../config/reference'
import { topicName } from '../data/aggregate'
import { useFilters } from '../state/filters'
import { Breadcrumbs } from '../components/ui'
import { PRIORITY_CLASS } from './CasesPage'

interface Typical {
  who: string; region: string; channel: string; intake: string; cat: CategoryCode; ved: VedId; topic: string
  organ: string; priority: 'Критический' | 'Высокий' | 'Средний' | 'Низкий'; score: number; status: string; result: string; collective?: number
}

// Шесть типовых обращений: путь жалобы от гражданина до ведомства (обезличено, демонстрация)
const TYPICAL: Typical[] = [
  { who: 'Мать военнослужащего', region: 'BU', channel: 'Личный прием', intake: 'Сотрудник аппарата заполняет карточку на приеме, классификатор предлагает тему', cat: '01', ved: 'mo', topic: 'search', organ: 'Войсковая часть (номер скрыт)', priority: 'Высокий', score: 66, status: 'В работе', result: 'Направлен запрос в Минобороны России' },
  { who: 'Человек с инвалидностью I группы', region: 'NIZ', channel: 'Горячая линия', intake: 'Оператор вносит обращение в форму, запись звонка прикрепляется к карточке', cat: '03', ved: 'trud', topic: 'tsr', organ: 'Отделение СФР (Нижегородская область)', priority: 'Высокий', score: 61, status: 'Право восстановлено', result: 'ТСР выдано через 19 дней после ходатайства' },
  { who: 'Осужденный', region: 'SVE', channel: 'Бумажное письмо', intake: 'Письмо сканируется, текст распознается, карточка проверяется специалистом', cat: '03', ved: 'fsin', topic: 'fmed', organ: 'ИК УФСИН (Свердловская область)', priority: 'Высокий', score: 75, status: 'Проверка с ОНК', result: 'Назначено медицинское обследование' },
  { who: 'Жильцы аварийного дома, 34 человека', region: 'SAR', channel: 'Электронная приемная', intake: 'Коллективное обращение, число пострадавших берется из формы', cat: '06', ved: 'prok', topic: 'nonexec', organ: 'Администрация г. Саратов', priority: 'Средний', score: 57, status: 'Меры приняты', result: 'Прокуратура внесла представление', collective: 34 },
  { who: 'Пенсионерка', region: 'TUL', channel: 'Выездной прием', intake: 'Обращение принято на выездном приеме, карточка заполнена в планшете', cat: '02', ved: 'mvd', topic: 'fraud', organ: 'ОМВД России по г. Новомосковск', priority: 'Средний', score: 44, status: 'Меры приняты', result: 'Уголовное дело возбуждено после ходатайства' },
  { who: 'Жительница Донецкой Народной Республики', region: 'DPR', channel: 'Электронная приемная', intake: 'Форма на сайте, документы о стаже прикреплены файлами', cat: '03', ved: 'trud', topic: 'pension', organ: 'Отделение СФР (Донецкая Народная Республика)', priority: 'Средний', score: 41, status: 'Право восстановлено', result: 'Ответ получен, пенсия пересчитана с учетом стажа' },
]

export default function TypicalPage() {
  const nav = useNavigate()
  const { qs } = useFilters()
  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs()}` }, { label: 'Типовые обращения' }]} />
      <div>
        <h1 className="text-2xl font-semibold">Типовые обращения</h1>
        <p className="text-muted">Путь жалобы от гражданина до ведомства. Заявители обезличены, примеры демонстрационные.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {TYPICAL.map((t, i) => {
          const reg = regionByIso.get(t.region)!
          const ved = vedById.get(t.ved)!
          return (
            <article key={i} className="card card-pad grid gap-3 content-start">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-md">{t.who}</h2>
                  <p className="text-sm text-muted">{reg.name}{t.collective ? ` · коллективное обращение` : ''}</p>
                </div>
                <span className={`badge shrink-0 ${PRIORITY_CLASS[t.priority]}`}>{t.priority} · {t.score}</span>
              </div>
              <ol className="grid gap-2 text-sm">
                {[
                  ['Канал подачи', t.channel],
                  ['Как попадает в систему', t.intake],
                  ['Категория права', `${t.cat} ${CATEGORIES.find((c) => c.code === t.cat)!.name}`],
                  ['Ведомство и тема', `${ved.short}: «${topicName(t.ved, t.topic)}»`],
                  ['Орган, на который жалуются', t.organ],
                  ['Результат', `${t.status}. ${t.result}`],
                ].map(([k, v], j) => (
                  <li key={k} className="grid grid-cols-[20px_1fr] gap-2">
                    <span className="num text-xs text-muted pt-0.5">{j + 1}</span>
                    <span><span className="text-muted">{k}: </span>{v}</span>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2 mt-1">
                <button className="btn-primary" onClick={() => nav(`/map?ved=${t.ved}&topic=${t.topic}&hl=${t.region}`)}><MapPin size={16} aria-hidden />Показать на карте</button>
                <button className="btn-secondary" onClick={() => nav(`/region/${reg.num}?ved=${t.ved}&topic=${t.topic}`)}>Страница региона<ArrowRight size={16} aria-hidden /></button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
