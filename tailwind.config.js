/** Дизайн-система «Оперативный штаб» (направление C). Описание: DESIGN.md */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F2F2',
        surface: '#FFFFFF',
        ink: '#222023',
        muted: '#615A64',
        line: '#E2DEDF',
        line2: '#CFC9CB',
        side: { DEFAULT: '#26232A', ink: '#DCD6DA', act: '#3A3238', bar: '#C2414B' },
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
        sans: ['Onest', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['13px', '18px'], sm: ['14px', '20px'], base: ['15px', '22px'], md: ['16px', '24px'],
        lg: ['18px', '26px'], xl: ['22px', '28px'], '2xl': ['26px', '32px'], '3xl': ['32px', '38px'],
      },
      borderRadius: { DEFAULT: '8px', md: '8px', lg: '10px' },
      boxShadow: { card: '0 1px 3px rgba(30,20,25,.06)', pop: '0 6px 24px rgba(40,10,15,.16)' },
    },
  },
  plugins: [],
}
