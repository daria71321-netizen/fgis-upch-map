// Сборка TopoJSON из regions.geojson: общие границы между субъектами хранятся один раз,
// что позволяет отдельно рисовать внутренние границы и границу страны. Запуск: npm run topo
import fs from 'node:fs'
import { topology } from 'topojson-server'
import type { FeatureCollection } from 'geojson'

const geo = JSON.parse(fs.readFileSync('public/data/regions.geojson', 'utf8')) as FeatureCollection
const topo = topology({ regions: geo }, 1e5)
fs.writeFileSync('public/data/regions.topo.json', JSON.stringify(topo))
console.log('regions.topo.json', Math.round(fs.statSync('public/data/regions.topo.json').size / 1024), 'KB')
