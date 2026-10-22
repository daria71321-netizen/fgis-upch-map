import type { VedId, CategoryCode } from '../config/reference'
import type { PriorityClass } from '../config/priority'

export interface Series {
  r: string
  v: VedId
  t: string
  n: number[]
  ans?: number[]
  dsum?: number[]
  late?: number[]
  done?: number[]
  viol?: number[]
  rest?: number[]
  rep?: number[]
}

export interface Muni { name: string; share: number; growth: number; topic: string }
export interface RegionExtras {
  munis: Muni[]
  prok: { clusters: { q: string; organ: string; topic: string; count: number }[]; cancelled: number; officials: number }
  trud: { applicants: Record<string, number>; sfr: { name: string; share: number }[] }
}

export interface DemoData {
  meta: {
    generated: string
    seed: number
    months: string[]
    partialMonth: string
    totals: Record<VedId, Record<string, number>>
    totalsReal: Record<VedId, number[]>
    source: string
  }
  series: Series[]
  extras: Record<string, RegionExtras>
}

export interface Institution {
  id: string
  ved: 'mvd' | 'fsin'
  type: string
  name: string
  r: string
  lon: number
  lat: number
  cap: number
  m: number[]
  topics: number[]
  visits: { date: string; by: string; result: string }[]
}

export interface CaseCard {
  id: string
  status: string
  received: string
  channel: string
  addressee: string
  ved: VedId
  topic: string
  organ: string
  sub: string
  cat: CategoryCode
  region: string
  muni: string
  deadline: string
  respDays: number | null
  overdue: number
  repeat: boolean
  type: string
  vuln: string
  applicant: string
  summary: string
  docs: string[]
  events: { date: string; title: string; text: string }[]
  result: string
  related?: string[]
  priority: {
    threat: number; vuln: number; rights: number; urgency: number; people: number; mass: number; repeat: number
    score: number; cls: PriorityClass; systemic: boolean
  }
}
