// Цвета карты (совпадают с tailwind.config.js). Интерфейс не использует цвет класса 5.
export const SCALE = ['#FDECEA', '#F8C1BA', '#EE8A80', '#D14B48', '#82101C'] as const
export const EST_FILL = '#EBE9EA'
export const EST_LINE = '#C6C1C4'
export const NODATA_FILL = '#7F797D'
export const BORDER_INNER = '#FFFFFF'
export const BORDER_COUNTRY = '#4A4248'
export const INK = '#222023'
export const ACCENT = '#A3242F'
export const GOOD = '#2B7A50'
export const BAD = '#B3261E'
export const MUTED = '#615A64'
export const LINE = '#E2DEDF'
/** Нейтральная палитра графиков (не путается со шкалой карты) */
export const CHART = { cur: '#A3242F', prev: '#9C949A', bar: '#5E5560', barHi: '#A3242F' }
export const classColor = (c: number | null | undefined) => (c ? SCALE[c - 1] : NODATA_FILL)
