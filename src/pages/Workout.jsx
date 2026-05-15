import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy, Dumbbell, Play, ChevronRight, X,
  Flame, TrendingUp, BarChart3, Calendar, BookOpen,
} from 'lucide-react'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'
import BottomNav from '../components/BottomNav'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVolumeShort(kg) {
  if (!kg) return '0'
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`
  if (kg >= 10_000)    return `${(kg / 1000).toFixed(0)}k`
  if (kg >= 1_000)     return `${(kg / 1000).toFixed(1)}k`
  return `${Math.round(kg)}`
}

function formatVolume(kg) {
  return kg > 0 ? `${formatVolumeShort(kg)} kg` : '0 kg'
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatShortDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formDotClass(score) {
  if (score == null) return null
  if (score >= 80) return 'bg-[#00FF88]'
  if (score >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded-2xl ${className}`} />
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, Icon, accent }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 flex flex-col gap-1.5 min-w-0">
      <Icon size={13} className={accent} />
      <p className="text-white font-bold text-base leading-none tabular-nums truncate">{value}</p>
      <p className="text-zinc-500 text-[10px] leading-tight truncate">{label}</p>
    </div>
  )
}

// ─── PR Card ──────────────────────────────────────────────────────────────────

function PRCard({ name, maxWeight, date }) {
  return (
    <div className="shrink-0 w-36 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Trophy size={11} className="text-amber-400 shrink-0" />
        <p className="text-white text-xs font-semibold truncate">{name}</p>
      </div>
      <p className="text-amber-300 font-black text-xl leading-none tabular-nums">{maxWeight} kg</p>
      <p className="text-zinc-600 text-[10px]">{formatShortDate(date)}</p>
    </div>
  )
}

// ─── Workout Card ─────────────────────────────────────────────────────────────

function WorkoutCard({ workout, onClick }) {
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0)
  const totalVol  = workout.exercises.reduce(
    (a, e) => a + e.sets.reduce((b, s) => b + (s.weight_kg ?? 0) * (s.reps_completed ?? 0), 0), 0
  )
  const names   = workout.exercises.map(e => e.name)
  const preview = names.length
    ? names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3} more` : '')
    : null

  return (
    <button
      onClick={onClick}
      className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-2xl p-4 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{formatDate(workout.started_at)}</p>
            {workout.duration_minutes != null && (
              <span className="text-zinc-500 text-xs">{workout.duration_minutes} min</span>
            )}
          </div>
          {preview && <p className="text-zinc-400 text-xs truncate">{preview}</p>}
          <div className="flex items-center gap-3 pt-0.5">
            <span className="text-zinc-600 text-[11px]">{totalSets} sets</span>
            {totalVol > 0 && <span className="text-zinc-600 text-[11px]">{formatVolume(totalVol)}</span>}
          </div>
        </div>
        <ChevronRight size={16} className="text-zinc-600 shrink-0 mt-0.5" />
      </div>
    </button>
  )
}

// ─── Workout Detail Modal ─────────────────────────────────────────────────────

function WorkoutDetailModal({ workout, onClose }) {
  if (!workout) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm px-5 pt-12 pb-4 flex items-start justify-between gap-4 border-b border-white/[0.06]">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold">Workout</p>
            <h2 className="text-white font-bold text-lg leading-snug">{formatDate(workout.started_at)}</h2>
            {workout.duration_minutes != null && (
              <p className="text-zinc-500 text-xs mt-0.5">{workout.duration_minutes} min</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <X size={17} />
          </button>
        </header>

        <div className="px-5 py-5 space-y-4">
          {workout.exercises.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No exercises logged.</p>
          )}
          {workout.exercises.map((ex, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-3">
              <p className="text-white font-semibold text-sm">{ex.name}</p>
              <div className="space-y-2">
                {[...ex.sets]
                  .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
                  .map((s, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <span className="text-zinc-600 text-xs w-5 tabular-nums">{s.set_number ?? j + 1}</span>
                      <span className="text-white text-sm tabular-nums">
                        {(s.weight_kg ?? 0) > 0 ? `${s.weight_kg} kg` : 'BW'} × {s.reps_completed}
                      </span>
                      {s.form_score != null && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${formDotClass(s.form_score)}`}
                          title={`Form: ${s.form_score}/100`}
                        />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Workout() {
  const navigate = useNavigate()
  const {
    recentWorkouts, personalRecords, totalWorkouts, totalVolume,
    thisWeekWorkouts, longestStreak, loading, error,
  } = useWorkoutHistory()

  const [selectedWorkout, setSelectedWorkout] = useState(null)

  const topPRs = useMemo(() =>
    Object.values(personalRecords)
      .filter(pr => pr.maxWeight > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6),
    [personalRecords]
  )

  return (
    <div className="min-h-screen bg-gray-950 pb-28 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-orange-500/[0.04] blur-[100px] rounded-full pointer-events-none" />

      <header className="relative z-10 px-5 pt-12 pb-5">
        <h1 className="text-2xl font-bold text-white">Workout</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Track, improve, repeat</p>
      </header>

      <div className="relative z-10 px-5 space-y-7">

        {/* Stats strip */}
        {loading ? (
          <div className="grid grid-cols-4 gap-2">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="This week" value={thisWeekWorkouts}            Icon={Calendar}   accent="text-[#00FF88]" />
            <StatCard label="Total"     value={totalWorkouts}               Icon={BarChart3}   accent="text-blue-400" />
            <StatCard label="Volume"    value={formatVolumeShort(totalVolume)} Icon={TrendingUp} accent="text-purple-400" />
            <StatCard label="Best streak" value={`${longestStreak}d`}       Icon={Flame}       accent="text-orange-400" />
          </div>
        )}

        {/* Quick start */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/workout/live')}
            className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(249,115,22,0.3)] hover:shadow-[0_0_32px_rgba(249,115,22,0.45)]"
          >
            <Play size={18} fill="currentColor" />
            Start Empty Workout
          </button>
          <button
            onClick={() => navigate('/exercise-library')}
            className="w-full bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.98] border border-white/[0.09] text-white font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <BookOpen size={16} />
            Browse Exercises
          </button>
        </div>

        {/* Personal Records */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy size={15} className="text-amber-400" />
            <h2 className="text-white font-semibold text-sm">Personal Records</h2>
          </div>
          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 w-36 shrink-0" />)}
            </div>
          ) : topPRs.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
              {topPRs.map((pr, i) => (
                <PRCard key={i} name={pr.name} maxWeight={pr.maxWeight} date={pr.date} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-8 text-center">
              <Trophy size={24} className="text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Complete workouts to track your PRs</p>
            </div>
          )}
        </section>

        {/* Recent Workouts */}
        <section className="space-y-3 pb-4">
          <div className="flex items-center gap-2">
            <Dumbbell size={15} className="text-zinc-400" />
            <h2 className="text-white font-semibold text-sm">Recent Workouts</h2>
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : recentWorkouts.length > 0 ? (
            <div className="space-y-2">
              {recentWorkouts.map(w => (
                <WorkoutCard key={w.id} workout={w} onClick={() => setSelectedWorkout(w)} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-10 text-center space-y-3">
              <Dumbbell size={28} className="text-zinc-700 mx-auto" />
              <div>
                <p className="text-white font-semibold text-sm">No workouts yet</p>
                <p className="text-zinc-500 text-xs mt-1">Start your first one!</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedWorkout && (
        <WorkoutDetailModal workout={selectedWorkout} onClose={() => setSelectedWorkout(null)} />
      )}

      <BottomNav />
    </div>
  )
}
