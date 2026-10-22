import { useMemo } from 'react'
import { useStore } from './store'
import { aggregate, regionStats, per10k, POP_WITH_DATA } from './aggregate'
import type { Sel } from './aggregate'
import { useFilters, periodRange } from '../state/filters'
import { INSTITUTION_MIN } from '../config/thresholds'

export function useSel(): Sel {
  const { filters } = useFilters()
  return useMemo(() => ({ ved: filters.ved, topic: filters.topic, cat: filters.cat }), [filters.ved, filters.topic, filters.cat])
}

export function useRegionStats(sel?: Sel) {
  const { data } = useStore()
  const { filters } = useFilters()
  const def = useSel()
  const s = sel ?? def
  return useMemo(() => regionStats(data, s, filters.period), [data, s, filters.period])
}

export function useNational(sel?: Sel) {
  const { data } = useStore()
  const { filters } = useFilters()
  const def = useSel()
  const s = sel ?? def
  return useMemo(() => {
    const agg = aggregate(data, { ...s, region: null }, filters.period)
    return { agg, rate: per10k(agg.n, POP_WITH_DATA) }
  }, [data, s, filters.period])
}

/** Учреждения МВД и ФСИН с числом жалоб за период; показываются только при 5 и более жалобах */
export function useInstitutions(ved: 'mvd' | 'fsin' | null, region?: string) {
  const { institutions } = useStore()
  const { filters } = useFilters()
  return useMemo(() => {
    const r = periodRange(filters.period)!
    return institutions
      .filter((i) => (!ved || i.ved === ved) && (!region || i.r === region))
      .map((i) => {
        let n = 0
        for (let k = r[0]; k <= r[1]; k++) n += i.m[k]
        return { ...i, n }
      })
      .filter((i) => i.n >= INSTITUTION_MIN)
      .sort((a, b) => b.n - a.n)
  }, [institutions, ved, region, filters.period])
}
