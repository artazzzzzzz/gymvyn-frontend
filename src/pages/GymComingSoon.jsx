import { useLocation, Link } from 'react-router-dom'
import { Construction, ArrowLeft } from 'lucide-react'
import GymOwnerNav from '../components/GymOwnerNav'

const TITLES = {
  '/gym/members':  { title: 'Members',   day: 'Day 9'  },
  '/gym/checkins': { title: 'Check-ins', day: 'Day 10' },
  '/gym/insights': { title: 'Insights',  day: 'Day 11' },
  '/gym/profile':  { title: 'Profile',   day: 'Day 12' },
}

export default function GymComingSoon() {
  const { pathname } = useLocation()
  const meta = TITLES[pathname] ?? { title: 'This page', day: 'soon' }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
          <Construction size={28} className="text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-3">{meta.title}</h1>
        <p className="text-zinc-400 text-sm max-w-md mb-8">
          Coming soon — building this in <span className="text-emerald-400 font-semibold">{meta.day}</span>.
        </p>
        <Link
          to="/gym/dashboard"
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>

      <GymOwnerNav />
    </div>
  )
}
