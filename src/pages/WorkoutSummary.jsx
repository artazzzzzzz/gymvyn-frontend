import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { Trophy, Clock, Layers, Dumbbell, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

const MUSCLE_COLOURS = {
  chest:     'bg-red-500/15 text-red-300 ring-red-500/30',
  back:      'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  legs:      'bg-green-500/15 text-green-300 ring-green-500/30',
  shoulders: 'bg-purple-500/15 text-purple-300 ring-purple-500/30',
  arms:      'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  biceps:    'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  triceps:   'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  core:      'bg-yellow-500/15 text-yellow-300 ring-yellow-500/30',
  cardio:    'bg-teal-500/15 text-teal-300 ring-teal-500/30',
}
function muscleClass(group) {
  return MUSCLE_COLOURS[(group ?? '').toLowerCase()] ?? 'bg-gray-500/15 text-gray-300 ring-gray-500/30'
}

function formatDuration(minutes) {
  if (!minutes || minutes < 1) return '< 1 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-gray-500" />
        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{label}</span>
      </div>
      <span className="text-white font-bold text-xl">{value}</span>
    </div>
  )
}

export default function WorkoutSummary() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const summary = location.state?.summary

  const [prs, setPrs] = useState({})
  const [prLoading, setPrLoading] = useState(true)

  useEffect(() => {
    if (!user || !summary?.exercises?.length) {
      setPrLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const result = {}
      try {
        const exerciseIds = summary.exercises.map(e => e.exerciseId)
        // All historical sets for this user (before this session) for these exercises
        const { data } = await supabase
          .from('workout_set_logs')
          .select('exercise_id, weight_kg, workout_log:workout_logs!inner(user_id, started_at)')
          .in('exercise_id', exerciseIds)
          .eq('workout_log.user_id', user.id)
          .lt('workout_log.started_at', summary.startedAt)

        const prevMax = {}
        for (const row of data ?? []) {
          const id = row.exercise_id
          const w = Number(row.weight_kg) || 0
          if (!(id in prevMax) || w > prevMax[id]) prevMax[id] = w
        }

        for (const ex of summary.exercises) {
          const sessionMax = ex.sets.reduce((m, s) => Math.max(m, s.weight), 0)
          const before = prevMax[ex.exerciseId] ?? 0
          if (sessionMax > 0 && sessionMax > before) {
            result[ex.exerciseId] = { weight: sessionMax, previous: before }
          }
        }
      } catch (err) {
        console.error('[WorkoutSummary] PR check error:', err)
      }
      if (!cancelled) {
        setPrs(result)
        setPrLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, summary])

  if (!summary) return <Navigate to="/workout" replace />

  const prCount = Object.keys(prs).length
  const formattedVolume = summary.totalVolume >= 1000
    ? `${(summary.totalVolume / 1000).toFixed(1)}k`
    : `${Math.round(summary.totalVolume)}`

  return (
    <div className="min-h-screen bg-gray-950 pb-16 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[260px] bg-emerald-500/[0.06] blur-[100px] rounded-full pointer-events-none" />

      <header className="relative z-10 px-5 pt-14 pb-6 text-center space-y-3">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30 items-center justify-center">
          <Trophy size={28} className="text-emerald-300" />
        </div>
        <div>
          <h1 className="text-white font-bold text-2xl">Workout Complete! 💪</h1>
          <p className="text-gray-500 text-sm mt-1">Nice work — your stats are saved.</p>
        </div>
      </header>

      <div className="relative z-10 px-5 space-y-5">
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={Clock}  label="Duration" value={formatDuration(summary.durationMinutes)} />
          <StatCard icon={Layers} label="Sets"     value={summary.totalSets} />
          <StatCard icon={Dumbbell} label="Volume" value={`${formattedVolume} kg`} />
        </div>

        {prLoading ? (
          <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
            <Loader2 size={16} className="text-gray-500 animate-spin" />
            <p className="text-gray-400 text-sm">Checking for personal records…</p>
          </div>
        ) : prCount > 0 && (
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-300" />
              <p className="text-yellow-200 font-bold text-sm">
                {prCount === 1 ? 'New Personal Record!' : `${prCount} New Personal Records!`}
              </p>
            </div>
            <div className="space-y-1.5">
              {summary.exercises.filter(ex => prs[ex.exerciseId]).map(ex => {
                const pr = prs[ex.exerciseId]
                return (
                  <div key={ex.exerciseId} className="flex items-center justify-between text-sm">
                    <span className="text-white font-medium truncate">{ex.exerciseName}</span>
                    <span className="text-yellow-200 font-mono font-semibold shrink-0 ml-3">
                      {pr.previous > 0 ? `${pr.previous} → ${pr.weight} kg` : `${pr.weight} kg`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {summary.exercises.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 px-1">Exercises</p>
            {summary.exercises.map(ex => (
              <div key={ex.exerciseId} className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-white font-semibold text-sm">{ex.exerciseName}</h3>
                  {ex.muscleGroup && (
                    <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ring-1 ring-inset ${muscleClass(ex.muscleGroup)}`}>
                      {ex.muscleGroup}
                    </span>
                  )}
                </div>
                <ul className="space-y-1">
                  {ex.sets.map(s => (
                    <li key={s.setNumber} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Set {s.setNumber}</span>
                      <span className="text-gray-200 font-mono">
                        {s.weight > 0 ? `${s.weight} kg × ${s.reps}` : `${s.reps} reps`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">No completed sets — but every session counts.</p>
          </div>
        )}

        <button
          onClick={() => navigate('/workout', { replace: true })}
          className="w-full py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-semibold transition-all shadow-[0_0_20px_rgba(249,115,22,0.35)]"
        >
          Done
        </button>
      </div>
    </div>
  )
}
