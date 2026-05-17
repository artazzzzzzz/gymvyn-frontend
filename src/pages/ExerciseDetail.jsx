import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Trophy, Dumbbell,
  TrendingUp, Award, BarChart3, Hash,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useExercises } from '../hooks/useExercises'
import { useExerciseHistory } from '../hooks/useExerciseHistory'
import { EXERCISE_INSTRUCTIONS } from '../data/exerciseInstructions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shortDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const SECONDARY_MAP = {
  'Bench Press':        ['Triceps', 'Shoulders'],
  'Squat':              ['Glutes', 'Hamstrings'],
  'Deadlift':           ['Glutes', 'Hamstrings'],
  'Overhead Press':     ['Triceps'],
  'Bent Over Row':      ['Biceps'],
  'Pull Up':            ['Biceps'],
  'Dip':                ['Triceps'],
  'Lunge':              ['Glutes'],
  'Romanian Deadlift':  ['Glutes', 'Back'],
  'Bicep Curl':         ['Forearms'],
  'Tricep Extension':   [],
  'Lateral Raise':      [],
  'Leg Press':          ['Glutes'],
  'Leg Curl':           [],
  'Calf Raise':         [],
  'Face Pull':          ['Traps'],
  'Cable Row':          ['Biceps'],
  'Chest Fly':          [],
  'Incline Bench Press':['Shoulders', 'Triceps'],
  'Front Squat':        ['Core'],
  'Hip Thrust':         ['Hamstrings'],
  'Plank':              [],
  'Arnold Press':       ['Triceps'],
  'Hammer Curl':        ['Forearms'],
  'Skull Crusher':      [],
  'Good Morning':       ['Back'],
  'Box Jump':           ['Glutes'],
  'Battle Ropes':       ['Core'],
  'Farmer Walk':        ['Traps', 'Core'],
  'Goblet Squat':       ['Glutes', 'Core'],
}

function getCategory(mg, name) {
  const m = (mg   ?? '').toLowerCase()
  const n = (name ?? '').toLowerCase()
  if (m === 'hamstrings' && (n.includes('deadlift') || n.includes('morning'))) return 'Hinge'
  if (['chest', 'triceps', 'shoulders'].includes(m)) return 'Push'
  if (['back', 'biceps', 'forearms'].includes(m))    return 'Pull'
  if (['legs', 'quads', 'glutes', 'calves', 'hamstrings'].includes(m)) return 'Legs'
  if (m === 'core') return 'Core'
  return 'Other'
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Summary', 'History', 'How To']

// ── Recharts custom tooltip ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-white/[0.10] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value} kg</p>
    </div>
  )
}

// ── Time filter helper ────────────────────────────────────────────────────────

function filterByTime(data, months) {
  if (!months) return data
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  return data.filter(d => new Date(d.rawDate) >= cutoff)
}

// ── Summary Tab ───────────────────────────────────────────────────────────────

function SummaryTab({ exercise, stats, chartData }) {
  const [chartMetric, setChartMetric] = useState('heaviestWeight')
  const [timeRange,   setTimeRange]   = useState(null)          // null = All

  const CHART_OPTIONS = [
    { key: 'heaviestWeight', label: 'Heaviest' },
    { key: 'est1RM',         label: '1RM'      },
    { key: 'bestSetVolume',  label: 'Volume'   },
  ]
  const TIME_OPTIONS = [
    { label: '3M', months: 3  },
    { label: '6M', months: 6  },
    { label: '1Y', months: 12 },
    { label: 'All', months: null },
  ]

  const visibleData = useMemo(
    () => filterByTime(chartData, timeRange),
    [chartData, timeRange]
  )

  return (
    <div className="space-y-5">

      {/* Stat cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Heaviest Weight', value: stats.heaviestWeight.value ? `${stats.heaviestWeight.value} kg` : '—', Icon: TrendingUp },
          { label: 'Est. 1RM',        value: stats.estimated1RM.value   ? `${stats.estimated1RM.value} kg`   : '—', Icon: Award    },
          { label: 'Total Sets',      value: stats.totalSets || '0',                                                  Icon: Hash     },
          { label: 'Best Volume',     value: stats.bestSetVolume.value  ? `${stats.bestSetVolume.value} kg`  : '—', Icon: BarChart3 },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-2">{label}</p>
            <p className="text-white text-2xl font-bold leading-none tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Progress chart */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Progress</p>
          {/* Time range */}
          <div className="flex gap-1">
            {TIME_OPTIONS.map(({ label, months }) => (
              <button
                key={label}
                onClick={() => setTimeRange(months)}
                className={[
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors',
                  timeRange === months
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-zinc-500 hover:text-zinc-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Metric pills */}
        <div className="flex gap-1.5 mb-4">
          {CHART_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setChartMetric(key)}
              className={[
                'text-[10px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors',
                chartMetric === key
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                  : 'text-zinc-500 ring-white/[0.07] hover:text-zinc-300',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleData.length < 2 ? (
          <div className="h-40 flex items-center justify-center text-zinc-600 text-xs">
            Not enough data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={visibleData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71717a', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#71717a', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={chartMetric}
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Personal Records */}
      {stats.totalSets > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-amber-400" />
            <p className="text-white font-semibold text-sm">Personal Records</p>
          </div>
          <div className="space-y-3">
            {[
              {
                label: 'Heaviest',
                value: `${stats.heaviestWeight.value} kg`,
                date: stats.heaviestWeight.date,
              },
              {
                label: 'Most Reps',
                value: `${stats.mostReps.value} reps @ ${stats.mostReps.weight} kg`,
                date: stats.mostReps.date,
              },
              {
                label: 'Best Volume Set',
                value: `${stats.bestSetVolume.weight} kg × ${stats.bestSetVolume.reps} = ${stats.bestSetVolume.value} kg`,
                date: stats.bestSetVolume.date,
              },
            ].map(({ label, value, date }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <span className="text-zinc-500 text-xs mt-0.5 shrink-0">{label}</span>
                <div className="text-right min-w-0">
                  <p className="text-white text-sm font-semibold">{value}</p>
                  <p className="text-zinc-600 text-[10px]">{shortDate(date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({ sessions, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20">
        <Dumbbell size={28} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No history yet</p>
        <p className="text-zinc-600 text-xs mt-1">Start logging to track your progress</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map(s => (
        <div key={s.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">{formatDate(s.date)}</p>
            <div className="flex items-center gap-3">
              {s.duration && <span className="text-zinc-500 text-xs">{s.duration} min</span>}
              <span className="text-zinc-600 text-xs">{s.totalVolume} kg total</span>
            </div>
          </div>
          <div className="space-y-1.5">
            {s.sets.map((set, i) => (
              <p key={i} className="text-zinc-400 text-xs tabular-nums">
                Set {set.set_number}: {set.weight_kg > 0 ? `${set.weight_kg} kg` : 'BW'} × {set.reps_completed}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── How To Tab ────────────────────────────────────────────────────────────────

function HowToTab({ exerciseName }) {
  const instructions = EXERCISE_INSTRUCTIONS[exerciseName]

  if (!instructions) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500 text-sm">Instructions not available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">

      {/* Setup */}
      <section>
        <h3 className="text-white font-semibold text-sm mb-2">Setup</h3>
        <p className="text-zinc-300 text-sm leading-relaxed">{instructions.setup}</p>
      </section>

      {/* Execution */}
      <section>
        <h3 className="text-white font-semibold text-sm mb-2">Execution</h3>
        <p className="text-zinc-300 text-sm leading-relaxed">{instructions.execution}</p>
      </section>

      {/* Tips */}
      <section>
        <h3 className="text-white font-semibold text-sm mb-3">Tips</h3>
        <ol className="space-y-2">
          {instructions.tips.map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-emerald-400 font-bold shrink-0 tabular-nums w-4">{i + 1}.</span>
              <span className="text-zinc-300">{tip}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Common Mistakes */}
      <section>
        <h3 className="text-red-400 font-semibold text-sm mb-3">Common Mistakes</h3>
        <ol className="space-y-2">
          {instructions.common_mistakes.map((m, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="text-red-400 font-bold shrink-0 tabular-nums w-4">{i + 1}.</span>
              <span className="text-zinc-300">{m}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExerciseDetail() {
  const navigate     = useNavigate()
  const { name }     = useParams()
  const exerciseName = decodeURIComponent(name ?? '')

  const { user }       = useAuth()
  const { allExercises } = useExercises()
  const { loading, sessions, stats, chartData } = useExerciseHistory(exerciseName, user?.id)

  const exercise = useMemo(
    () => allExercises.find(e => e.name === exerciseName) ?? { name: exerciseName, muscle_group: '—' },
    [allExercises, exerciseName]
  )

  const secondary = SECONDARY_MAP[exerciseName] ?? []
  const category  = getCategory(exercise.muscle_group, exerciseName)

  const [activeTab, setActiveTab] = useState('Summary')

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-sm px-5 pt-12 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-white font-bold text-base truncate flex-1 text-center pr-9">
            {exerciseName}
          </h1>
        </div>
      </header>

      <div className="px-5 pt-5 pb-12 space-y-5">

        {/* ── Exercise info card ── */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-white text-xl font-bold mb-3">{exerciseName}</h2>
          <div className="flex flex-wrap gap-2 mb-2">
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

        {/* ── Tabs ── */}
        <div className="border-b border-white/[0.06]">
          <div className="flex">
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

        {/* ── Tab content ── */}
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
