/** Дизайн-система «Континуум» (направление C, современная редакция). Описание: DESIGN.md */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F3EFED',
        surface: '#FFFFFF',
        ink: '#222023',
        muted: '#615A64',
        line: '#E9E3E1',
        line2: '#CFC9CB',
        side: { DEFAULT: '#1C181B', ink: '#D9D1D4', act: '#A3242F', bar: '#C2414B' },
        accent: { DEFAULT: '#A3242F', hover: '#8B1E2D', soft: '#F8E7E8', ink: '#7A1A24' },
        good: { DEFAULT: '#2B7A50', soft: '#E6F2EB' },
        bad: { DEFAULT: '#B3261E', soft: '#FBEAE8' },
        warn: { DEFAULT: '#9A5B00', soft: '#FFF3DC' },
        info: { DEFAULT: '#4E5966', soft: '#EEF0F3' },
        // шкала карты: класс 1 (спокойно) -> класс 5 (требует внимания)
        c1: '#FDECEA', c2: '#F8C1BA', c3: '#EE8A80', c4: '#D14B48', c5: '#82101C',
        est: { DEFAULT: '#EBE9EA', line: '#C6C1C4' },
        nodata: '#7F797D',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['13px', '18px'], sm: ['14px', '20px'], base: ['15px', '22px'], md: ['16px', '24px'],
        lg: ['18px', '26px'], xl: ['22px', '28px'], '2xl': ['26px', '32px'], '3xl': ['32px', '38px'],
      },
      borderRadius: { DEFAULT: '12px', md: '12px', lg: '22px', xl: '28px' },
      boxShadow: { card: '0 1px 2px rgba(40,20,25,.04), 0 8px 28px -12px rgba(60,20,30,.12)', pop: '0 18px 48px -12px rgba(40,10,15,.28)' },
    },
  },
  plugins: [],
}
