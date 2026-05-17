import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MoreVertical, TrendingUp, Award, BarChart3, Hash } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useExercises } from '../hooks/useExercises'
import { useExerciseHistory } from '../hooks/useExerciseHistory'
import { EXERCISE_INSTRUCTIONS } from '../data/exerciseInstructions'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const SECONDARY_MAP = {
  'Bench Press': ['Triceps', 'Shoulders'],
  'Squat': ['Glutes', 'Hamstrings'],
  'Deadlift': ['Glutes', 'Hamstrings'],
  'Overhead Press': ['Triceps'],
  'Bent Over Row': ['Biceps'],
  'Pull Up': ['Biceps'],
  'Dip': ['Triceps'],
  'Lunge': ['Glutes'],
  'Romanian Deadlift': ['Glutes', 'Back'],
  'Bicep Curl': ['Forearms'],
  'Tricep Extension': [],
  'Lateral Raise': [],
  'Leg Press': ['Glutes'],
  'Leg Curl': [],
  'Calf Raise': [],
  'Face Pull': ['Traps'],
  'Cable Row': ['Biceps'],
  'Chest Fly': [],
  'Incline Bench Press': ['Shoulders', 'Triceps'],
  'Front Squat': ['Core'],
  'Hip Thrust': ['Hamstrings'],
  'Plank': [],
  'Arnold Press': ['Triceps'],
  'Hammer Curl': ['Forearms'],
  'Skull Crusher': [],
  'Good Morning': ['Back'],
  'Box Jump': ['Glutes'],
  'Battle Ropes': ['Core'],
  'Farmer Walk': ['Traps', 'Core'],
  'Goblet Squat': ['Glutes', 'Core'],
}

function getCategory(mg, name) {
  const m = (mg ?? '').toLowerCase()
  const n = (name ?? '').toLowerCase()
  if (m === 'hamstrings' && (n.includes('deadlift') || n.includes('morning'))) return 'Hinge'
  if (['chest', 'triceps', 'shoulders'].includes(m)) return 'Push'
  if (['back', 'biceps', 'forearms'].includes(m)) return 'Pull'
  if (['legs', 'quads', 'glutes', 'calves', 'hamstrings'].includes(m)) return 'Legs'
  if (m === 'core') return 'Core'
  if (n.includes('rope') || n.includes('cardio')) return 'Cardio'
  return 'Other'
}

// ── Tabs ────────────────────────────────────────────────────────────────────────

const TABS = ['Summary', 'History', 'How To']

// ── Stat Card ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, Icon }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3.5 flex flex-col gap-1">
      <Icon size={13} className="text-emerald-400" />
      <p className="text-white font-bold text-lg leading-none tabular-nums">{value}</p>
      <p className="text-zinc-500 text-[10px] leading-tight">{label}</p>
    </div>
  )
}

// ── Chart (lightweight SVG — avoids Recharts dep) ───────────────────────────────

function MiniChart({ data, yKey }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-zinc-600 text-xs">
        Not enough data to chart
      </div>
    )
  }

  const values = data.map(d => d[yKey] ?? 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const W = 320
  const H = 140
  const padX = 0
  const padY = 10

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (W - padX * 2)
    const y = padY + (1 - (v - min) / range) * (H - padY * 2)
    return `${x},${y}`
  })

  return (
    <div className="overflow-hidden rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none">
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => {
          const x = padX + (i / (values.length - 1)) * (W - padX * 2)
          const y = padY + (1 - (v - min) / range) * (H - padY * 2)
          return <circle key={i} cx={x} cy={y} r="3" fill="#10b981" />
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-zinc-600 mt-1 px-0.5">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  )
}

// ── Summary Tab ─────────────────────────────────────────────────────────────────

function SummaryTab({ exercise, stats, chartData }) {
  const [chartMetric, setChartMetric] = useState('heaviestWeight')
  const secondary = SECONDARY_MAP[exercise.name] ?? []
  const category = getCategory(exercise.muscle_group, exercise.name)

  const CHART_OPTIONS = [
    { key: 'heaviestWeight', label: 'Weight' },
    { key: 'est1RM', label: 'Est. 1RM' },
    { key: 'bestSetVolume', label: 'Volume' },
  ]

  return (
    <div className="space-y-5">
      {/* Muscle info card */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-white font-bold text-lg mb-3">{exercise.name}</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
            {exercise.muscle_group}
          </span>
          {secondary.map(m => (
            <span key={m} className="px-3 py-1 bg-white/[0.06] text-zinc-400 text-xs rounded-full">
              {m}
            </span>
          ))}
        </div>
        <span className="text-zinc-600 text-xs">{category}</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Heaviest Weight" value={stats.heaviestWeight.value ? `${stats.heaviestWeight.value} kg` : '—'} Icon={TrendingUp} />
        <StatCard label="Est. 1RM" value={stats.estimated1RM.value ? `${stats.estimated1RM.value} kg` : '—'} Icon={Award} />
        <StatCard label="Best Set Volume" value={stats.bestSetVolume.value ? `${stats.bestSetVolume.value} kg` : '—'} Icon={BarChart3} />
        <StatCard label="Total Sets" value={stats.totalSets || '0'} Icon={Hash} />
      </div>

      {/* Chart */}
      <div className="space-y-2">
        <h3 className="text-white font-semibold text-sm">Progress</h3>
        <div className="flex gap-1.5 mb-2">
          {CHART_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setChartMetric(opt.key)}
              className={[
                'text-[10px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors',
                chartMetric === opt.key
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                  : 'text-zinc-500 ring-white/[0.08] hover:text-zinc-300',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <MiniChart data={chartData} yKey={chartMetric} />
      </div>

      {/* Personal Records */}
      {stats.totalSets > 0 && (
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm">Personal Records</h3>
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-zinc-400 text-xs">Heaviest</span>
              <span className="text-white text-sm font-semibold">{stats.heaviestWeight.value} kg <span className="text-zinc-600 text-[10px]">{shortDate(stats.heaviestWeight.date)}</span></span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-zinc-400 text-xs">Most Reps</span>
              <span className="text-white text-sm font-semibold">{stats.mostReps.value} reps @ {stats.mostReps.weight} kg <span className="text-zinc-600 text-[10px]">{shortDate(stats.mostReps.date)}</span></span>
            </div>
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-zinc-400 text-xs">Best Volume Set</span>
              <span className="text-white text-sm font-semibold">{stats.bestSetVolume.weight} kg x {stats.bestSetVolume.reps} = {stats.bestSetVolume.value} kg <span className="text-zinc-600 text-[10px]">{shortDate(stats.bestSetVolume.date)}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── History Tab ─────────────────────────────────────────────────────────────────

function HistoryTab({ sessions, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />)}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">No history yet. Start logging!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map(s => (
        <div key={s.id} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm">{formatDate(s.date)}</p>
            {s.duration && <span className="text-zinc-500 text-xs">{s.duration} min</span>}
          </div>
          <div className="space-y-1">
            {s.sets.map((set, i) => (
              <p key={i} className="text-zinc-400 text-xs tabular-nums">
                Set {set.set_number}: {set.weight_kg} kg x {set.reps_completed}
              </p>
            ))}
          </div>
          <p className="text-zinc-600 text-[10px]">Total volume: {s.totalVolume} kg</p>
        </div>
      ))}
    </div>
  )
}

// ── How To Tab ──────────────────────────────────────────────────────────────────

function HowToTab({ exerciseName }) {
  const instructions = EXERCISE_INSTRUCTIONS[exerciseName]

  if (!instructions) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 text-sm">Instructions not available for this exercise yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Setup */}
      <section className="space-y-1.5">
        <h3 className="text-white font-semibold text-sm">Setup</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{instructions.setup}</p>
      </section>

      {/* Execution */}
      <section className="space-y-1.5">
        <h3 className="text-white font-semibold text-sm">Execution</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{instructions.execution}</p>
      </section>

      {/* Tips */}
      <section className="space-y-2">
        <h3 className="text-white font-semibold text-sm">Tips</h3>
        <ul className="space-y-1.5">
          {instructions.tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-emerald-400 shrink-0">•</span>
              <span className="text-zinc-400">{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Common Mistakes */}
      <section className="space-y-2">
        <h3 className="text-red-400 font-semibold text-sm">Common Mistakes</h3>
        <ul className="space-y-1.5">
          {instructions.common_mistakes.map((m, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-red-400 shrink-0">•</span>
              <span className="text-red-300/70">{m}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function ExerciseDetail() {
  const navigate = useNavigate()
  const { name } = useParams()
  const exerciseName = decodeURIComponent(name ?? '')

  const { user } = useAuth()
  const { allExercises } = useExercises()
  const { loading, sessions, stats, chartData } = useExerciseHistory(exerciseName, user?.id)

  const exercise = useMemo(
    () => allExercises.find(e => e.name === exerciseName) ?? { name: exerciseName, muscle_group: '—' },
    [allExercises, exerciseName]
  )

  const [activeTab, setActiveTab] = useState('Summary')

  return (
    <div className="min-h-screen bg-gray-950 pb-10 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-emerald-500/[0.04] blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-3 flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-white font-bold text-base truncate text-center flex-1">{exerciseName}</h1>
        <button className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-zinc-400">
          <MoreVertical size={16} />
        </button>
      </header>

      {/* Tabs */}
      <div className="relative z-10 px-5 mb-5">
        <div className="flex border-b border-white/[0.06]">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-1 py-2.5 text-xs font-semibold text-center transition-colors relative',
                activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-300',
              ].join(' ')}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="relative z-10 px-5">
        {activeTab === 'Summary' && (
          <SummaryTab exercise={exercise} stats={stats} chartData={chartData} />
        )}
        {activeTab === 'History' && (
          <HistoryTab sessions={sessions} loading={loading} />
        )}
        {activeTab === 'How To' && (
          <HowToTab exerciseName={exerciseName} />
        )}
      </div>
    </div>
  )
}
