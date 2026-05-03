import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, Flame, Zap, Apple, TrendingUp, Users,
  Dumbbell, ChevronRight, MessageSquare, Building2,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { useStreak } from '../hooks/useStreak'
import BottomNav from '../components/BottomNav'

function todayLabel() {
  const now = new Date()
  return {
    day:  now.toLocaleDateString('en-US', { weekday: 'long' }),
    date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const { day, date } = todayLabel()
  const { current: streakDays, best: bestStreak } = useStreak(user?.id)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('full_name, goal, training_days, role')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data))
  }, [user])

  // Default to consumer if role hasn't loaded yet (most users) — gym staff/owners see no pill
  const isConsumer = !profile || !profile.role || profile.role === 'consumer'

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'Athlete'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // ── Quick actions ───────────────────────────────────────────────────────────
  const quickActions = [
    { label: 'Form\nCoach',    icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', to: '/workout'   },
    { label: 'Diet',           icon: Apple,         color: 'text-emerald-400', bg: 'bg-emerald-500/10', to: '/diet'     },
    { label: 'Progress',       icon: TrendingUp,    color: 'text-sky-400',    bg: 'bg-sky-500/10',    to: '/progress'  },
    { label: 'Community',      icon: Users,         color: 'text-amber-400',  bg: 'bg-amber-500/10',  to: '/community' },
  ]

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-emerald-500/[0.07] blur-[100px] rounded-full pointer-events-none" />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-2">
        <div>
          <p className="text-zinc-500 text-sm">Hey {firstName} 👋</p>
          <h1 className="text-xl font-bold text-white mt-0.5">Good{getGreeting()}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isConsumer && (
            <button
              onClick={() => navigate('/become-gym-owner')}
              className="hidden sm:inline-flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full px-3 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Building2 size={12} className="text-emerald-400" />
              Are you a gym owner?
              <ChevronRight size={12} />
            </button>
          )}
          {isConsumer && (
            <button
              onClick={() => navigate('/become-gym-owner')}
              className="sm:hidden w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Become a gym owner"
            >
              <Building2 size={16} />
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            aria-label="Settings / Sign out"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ── Date pill ───────────────────────────────────────────── */}
      <div className="relative z-10 px-5 mt-3 mb-6">
        <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-3.5 py-1.5">
          <span className="text-emerald-400 text-xs font-semibold">{day}</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-zinc-400 text-xs">{date}</span>
        </div>
      </div>

      <div className="relative z-10 px-5 space-y-4">

        {/* ── Today's Workout card ─────────────────────────────── */}
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Dumbbell size={14} className="text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-white">Today's Workout</span>
            </div>
            <span className="text-xs text-zinc-600 capitalize">
              {profile?.goal?.replace('_', ' ') ?? '—'}
            </span>
          </div>

          <div className="flex flex-col items-center py-5 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <Dumbbell size={22} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500 text-sm text-center">No workout generated yet</p>
            <button className="mt-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-2">
              <Zap size={14} />
              Generate My Plan
            </button>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Calories */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Flame size={12} className="text-orange-400" />
              </div>
              <span className="text-xs font-medium text-zinc-400">Calories</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">0</p>
            <p className="text-xs text-zinc-600 mb-3">/ 2,000 kcal</p>
            {/* Progress bar */}
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Streak */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Flame size={12} className="text-amber-400" />
              </div>
              <span className="text-xs font-medium text-zinc-400">Streak</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{streakDays}</p>
            <p className="text-xs text-zinc-600">days in a row</p>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${i < Math.min(streakDays, 7) ? 'bg-amber-400' : 'bg-white/[0.06]'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, color, bg, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 py-4 bg-[#141416] border border-white/[0.06] rounded-2xl hover:border-white/[0.14] transition-all duration-150 active:scale-[0.96]"
              >
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
                <span className="text-[10px] font-medium text-zinc-400 text-center leading-tight whitespace-pre-line">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Training schedule banner ───────────────────────────── */}
        {profile?.training_days && (
          <button
            onClick={() => navigate('/workout')}
            className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl px-5 py-4 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Dumbbell size={15} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{profile.training_days} days / week</p>
                <p className="text-xs text-zinc-500">Your training schedule</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return ' morning'
  if (h < 17) return ' afternoon'
  return ' evening'
}
