import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-white">
      {/* Nav */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">
            FitForge <span className="text-emerald-400">AI</span>
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-zinc-400 text-sm mb-1">Welcome back 👋</p>
          <h1 className="text-3xl font-bold text-white">
            {user?.email?.split('@')[0] ?? 'Athlete'}
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Workouts', value: '0', unit: 'total' },
            { label: 'Streak', value: '0', unit: 'days' },
            { label: 'Calories', value: '0', unit: 'burned' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">{stat.label}</p>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{stat.unit}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-xl font-semibold text-white mb-2">Ready to train?</h2>
          <p className="text-zinc-400 text-sm mb-6">Your AI coach is ready to build your personalized plan.</p>
          <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 text-sm">
            Start workout
          </button>
        </div>
      </main>
    </div>
  )
}
