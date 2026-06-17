import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Hammer, Home as HomeIcon, Plus } from 'lucide-react'
import Home from '@/pages/Home'
import NewRound from '@/pages/NewRound'
import Claim from '@/pages/Claim'

function Navbar() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-bark/95 backdrop-blur-sm sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Hammer className="w-7 h-7 text-wood group-hover:text-sand transition-colors" />
            <span className="font-display text-xl font-bold text-cream tracking-wide">
              手作工坊<span className="text-wood">·</span>材料柜
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/') ? 'bg-wood/20 text-wood' : 'text-cream/70 hover:text-cream hover:bg-white/10'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              首页
            </Link>
            <Link
              to="/admin/rounds/new"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/admin/rounds/new') ? 'bg-wood/20 text-wood' : 'text-cream/70 hover:text-cream hover:bg-white/10'
              }`}
            >
              <Plus className="w-4 h-4" />
              发布轮次
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/rounds/new" element={<NewRound />} />
          <Route path="/claim/:roundId" element={<Claim />} />
        </Routes>
      </main>
      <footer className="border-t border-sand/50 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-bark/40">手作工坊·材料柜 — 公平申领，透明抽签</p>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
