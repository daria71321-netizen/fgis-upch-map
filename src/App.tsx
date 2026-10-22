import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import MapPage from './pages/MapPage'
import RegionPage from './pages/RegionPage'
import VedsPage from './pages/VedsPage'
import TypicalPage from './pages/TypicalPage'
import CasesPage from './pages/CasesPage'
import CasePage from './pages/CasePage'
import ReportsPage from './pages/ReportsPage'

function NotFound() {
  return (
    <div className="card card-pad grid gap-2 max-w-lg">
      <h1 className="text-xl font-semibold">Страница не найдена</h1>
      <Link to="/" className="link">Вернуться к карте России</Link>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/veds" element={<VedsPage />} />
        <Route path="/region/:num" element={<RegionPage />} />
        <Route path="/typical" element={<TypicalPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/case/:id" element={<CasePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
