import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ClipboardCheck, IndianRupee, Brain, Copy, Check, LogOut, Building2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getGymByUserId } from '../utils/api'

const PLACEHOLDERS = [
  { icon: Users,          color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Members' },
  { icon: ClipboardCheck, color: 'text-sky-400',     bg: 'bg-sky-500/10',     label: 'Check-ins' },
  { icon: IndianRupee,    color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Revenue' },
  { icon: Brain,          color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Churn AI' },
]

export default function GymDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [gym, setGym]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!user) return
      try {
        const data = await getGymByUserId(user.id)
        if (!cancelled) setGym(data)
      } catch (err) {
        console.error('Get gym error:', err)
        if (!cancelled) setError(err.message || 'Failed to load your gym.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  async function handleCopy() {
    if (!gym?.join_code) return
    try {
      await navigator.clipboard.writeText(gym.join_code.toUpperCase())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Clipboard error:', err)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] overflow-x-hidden flex flex-col">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-5 py-12 sm:py-14">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Building2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-widest font-semibold">Gym Dashboard</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-0.5">
                Welcome to your gym dashboard, <span className="text-emerald-400">{gym?.name ?? '—'}</span>
              </h1>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Join code card */}
        {gym?.join_code && (
          <div className="bg-[#141416] border border-emerald-500/20 rounded-2xl p-6 sm:p-7 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Your gym join code</p>
              <p className="text-4xl sm:text-5xl font-bold text-emerald-400 font-mono tracking-[0.3em]">
                {gym.join_code.toUpperCase()}
              </p>
              <p className="text-xs text-zinc-500 mt-3">Members enter this code in their FitForge app to join your gym</p>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 self-start sm:self-auto"
            >
              {copied ? <><Check size={14} className="text-emerald-400" /> Copied!</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        )}

        {/* Coming soon banner */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-6 text-center">
          <p className="text-base font-semibold text-white mb-1">Coming soon</p>
          <p className="text-sm text-zinc-500">
            Member management, check-ins, revenue analytics and AI churn prediction are on the way.
          </p>
        </div>

        {/* Placeholder grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-12">
          {PLACEHOLDERS.map(({ icon: Icon, color, bg, label }) => (
            <div
              key={label}
              className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 flex flex-col items-center text-center"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{label}</p>
              <p className="text-xs text-zinc-600">Coming soon</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-5">
        <div className="max-w-4xl mx-auto px-5 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Logged in as <span className="text-zinc-300">gym owner</span>
          </p>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut size={12} />
            Log out
          </button>
        </div>
      </footer>
    </div>
  )
}
