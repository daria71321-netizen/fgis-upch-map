import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base = имя репозитория на GitHub Pages (https://<user>.github.io/<repo>/)
const REPO = process.env.VITE_BASE ?? '/fgis-upch-map/'

export default defineConfig({
  base: REPO,
  plugins: [react()],
})
