import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bell, CalendarPlus, FileText, ArrowLeft } from 'lucide-react'
import { useStore } from '../data/store'
import { useFilters } from '../state/filters'
import { vedById, regionByIso, CATEGORIES, SUBCATEGORIES } from '../config/reference'
import { PRIORITY_CRITERIA, APPEAL_TYPES } from '../config/priority'
import { topicName } from '../data/aggregate'
import { fmtDate } from '../lib/format'
import { Breadcrumbs, Section } from '../components/ui'
import { statusClass, PRIORITY_CLASS } from './CasesPage'

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(140px,200px)_1fr] gap-3 py-2 border-b border-line last:border-0 text-sm">
      <dt className="text-muted">{k}</dt><dd className="min-w-0">{v}</dd>
    </div>
  )
}

export default function CasePage() {
  const { id } = useParams()
  const { casesById } = useStore()
  const { qs } = useFilters()
  const [toast, setToast] = useState<string | null>(null)
  const c = id ? casesById.get(id) : undefined
  if (!c) return <div className="card card-pad">Обращение не найдено. <Link className="link" to={`/cases${qs()}`}>К списку обращений</Link></div>
  const ved = vedById.get(c.ved)!
  const reg = regionByIso.get(c.region)!
  const show = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3500) }

  return (
    <div className="grid gap-4">
      <Breadcrumbs items={[{ label: 'Обзор по России', to: `/${qs()}` }, { label: 'Обращения', to: `/cases${qs()}` }, { label: c.id }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1.5">
          <h1 className="page-title">Обращение {c.id}</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`badge ${statusClass(c.status)}`}>{c.status}</span>
            <span className={`badge ${PRIORITY_CLASS[c.priority.cls]}`}>Приоритет: {c.priority.cls}, {c.priority.score} баллов</span>
            {c.priority.systemic && <span className="badge bg-accent-soft text-accent-ink">Системная проблема</span>}
            {c.repeat && <span className="badge bg-bg text-muted border border-line">Повторное</span>}
            <span className="badge bg-bg text-muted border border-line">Демонстрационная карточка</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 no-print">
          {c.overdue > 0 && !c.respDays && (
            <>
              <button className="btn-primary" onClick={() => show(`Напоминание направлено: ${ved.name} (демонстрация, письмо не отправляется)`)}><Bell size={16} aria-hidden />Напомнить ведомству</button>
              <button className="btn-secondary" onClick={() => show('Срок продлен на 30 дней (демонстрация, изменения не сохраняются)')}><CalendarPlus size={16} aria-hidden />Продлить срок</button>
            </>
          )}
          <Link to={`/cases${qs()}`} className="btn-secondary"><ArrowLeft size={16} aria-hidden />К списку</Link>
        </div>
      </div>
      {toast && <div role="status" className="fixed bottom-5 right-5 z-50 rounded bg-ink text-white px-4 py-3 shadow-pop text-sm max-w-sm">{toast}</div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4 content-start min-w-0">
          <Section title="Сведения">
            <dl>
              <Row k="Дата поступления" v={fmtDate(c.received)} />
              <Row k="Канал подачи" v={c.channel} />
              <Row k="Вид обращения" v={`${c.type} ${APPEAL_TYPES.find((a) => a.code === c.type)?.name ?? ''}`} />
              <Row k="Заявитель" v={<span className="num">{c.applicant} (обезличенный номер)</span>} />
              <Row k="Уязвимая группа" v={c.vuln} />
              <Row k="Адресат" v={c.addressee} />
              <Row k="Ведомство, куда направлено" v={ved.name} />
              <Row k="Орган, на который жалуются" v={c.organ} />
              <Row k="Тема" v={topicName(c.ved, c.topic)} />
              <Row k="Категория прав" v={`${c.cat} ${CATEGORIES.find((x) => x.code === c.cat)!.name}; ${c.sub} ${SUBCATEGORIES[c.sub] ?? ''}`} />
              <Row k="Регион" v={<Link className="link" to={`/region/${reg.num}${qs()}`}>{reg.name}</Link>} />
              <Row k="Муниципалитет" v={c.muni} />
              <Row k="Срок ответа ведомства" v={<>до {fmtDate(c.deadline)}{c.respDays !== null && <> · ответ через {c.respDays} дн.</>}{c.overdue > 0 && <span className="text-bad font-medium"> · просрочка {c.overdue} дн.</span>}</>} />
            </dl>
          </Section>
          <Section title="Суть обращения">
            <p>{c.summary}</p>
            {c.docs.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {c.docs.map((d) => <li key={d} className="chip !pr-3"><FileText size={14} aria-hidden />{d}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted">Персональные данные заявителя не отображаются. Названия документов демонстрационные.</p>
          </Section>
          <Section title="История рассмотрения">
            <ol className="relative border-l-2 border-line ml-2 grid gap-4">
              {c.events.map((e, i) => (
                <li key={i} className="pl-4 relative">
                  <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ${i === c.events.length - 1 ? 'bg-accent' : 'bg-line2'}`} />
                  <p className="text-xs text-muted num">{fmtDate(e.date)}</p>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted">{e.text}</p>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Результат рассмотрения">
            <p>{c.result || 'Рассмотрение не завершено'}</p>
          </Section>
        </div>
        <div className="grid gap-4 content-start">
          <Section title="Расчет приоритета" aside={<span className="text-xs text-muted">модель «Ранжирование»</span>}>
            <table className="tbl">
              <tbody>
                {PRIORITY_CRITERIA.map((k) => (
                  <tr key={k.key}><td>{k.name}</td><td className="text-right num">{c.priority[k.key]} × {k.w}</td><td className="text-right num">{c.priority[k.key] * k.w}</td></tr>
                ))}
                <tr><td className="font-semibold">Итого</td><td /><td className="text-right num font-semibold">{c.priority.score}</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-muted">80-100 критический, 60-79 высокий, 35-59 средний, 20-34 низкий. Угроза 4 и 5 поднимает балл до 75 и 85.</p>
          </Section>
          {c.related && c.related.length > 0 && (
            <Section title="Связанные обращения">
              <ul className="grid gap-1">
                {c.related.map((r) => <li key={r}><Link className="link num" to={`/case/${r}${qs()}`}>{r}</Link></li>)}
              </ul>
              <p className="text-xs text-muted">Ранее тот же заявитель обращался по той же теме.</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
