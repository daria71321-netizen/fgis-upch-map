import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Topology } from 'topojson-specification'
import type { DemoData, Institution, CaseCard } from './types'

const base = import.meta.env.BASE_URL
const getJson = async <T,>(file: string): Promise<T> => {
  const r = await fetch(`${base}data/${file}`)
  if (!r.ok) throw new Error(`${file}: ${r.status}`)
  return r.json() as Promise<T>
}

interface Store {
  data: DemoData
  institutions: Institution[]
  cases: CaseCard[]
  casesById: Map<string, CaseCard>
}
type Load<T> = { state: 'loading' } | { state: 'error'; error: string } | { state: 'ok'; value: T }

const DataCtx = createContext<Store | null>(null)
const GeoCtx = createContext<{ geo: Load<Topology>; retry: () => void }>({ geo: { state: 'loading' }, retry: () => {} })

export function DataProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<Load<Store>>({ state: 'loading' })
  const [geo, setGeo] = useState<Load<Topology>>({ state: 'loading' })

  const loadData = useCallback(() => {
    setSt({ state: 'loading' })
    Promise.all([getJson<DemoData>('demo-data.json'), getJson<Institution[]>('institutions.json'), getJson<CaseCard[]>('cases.json')])
      .then(([data, institutions, cases]) =>
        setSt({ state: 'ok', value: { data, institutions, cases, casesById: new Map(cases.map((c) => [c.id, c])) } }),
      )
      .catch((e) => setSt({ state: 'error', error: String(e) }))
  }, [])
  const loadGeo = useCallback(() => {
    setGeo({ state: 'loading' })
    getJson<Topology>('regions.topo.json')
      .then((g) => setGeo({ state: 'ok', value: g }))
      .catch((e) => setGeo({ state: 'error', error: String(e) }))
  }, [])
  useEffect(() => { loadData(); loadGeo() }, [loadData, loadGeo])

  if (st.state !== 'ok')
    return (
      <div className="min-h-screen grid place-items-center p-6">
        {st.state === 'loading' ? (
          <p className="text-muted">Загрузка данных ФГИС УПЧ...</p>
        ) : (
          <div className="card card-pad max-w-md text-center grid gap-3">
            <h1 className="text-lg font-semibold">Не удалось загрузить данные</h1>
            <p className="text-muted text-sm">Проверьте подключение к интернету и повторите попытку. Техническая причина: {st.error}</p>
            <button className="btn-primary justify-self-center" onClick={loadData}>Повторить загрузку</button>
          </div>
        )}
      </div>
    )
  return (
    <DataCtx.Provider value={st.value}>
      <GeoCtx.Provider value={{ geo, retry: loadGeo }}>{children}</GeoCtx.Provider>
    </DataCtx.Provider>
  )
}

export const useStore = () => useContext(DataCtx)!
export const useGeo = () => useContext(GeoCtx)
