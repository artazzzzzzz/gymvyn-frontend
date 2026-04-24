import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Dumbbell, Zap, Moon, Play, Clock, RotateCcw, Loader2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import supabase from '../utils/supabaseClient'
import BottomNav from '../components/BottomNav'

const API = import.meta.env.VITE_BACKEND_URL
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getTodayIndex() {
  const d = new Date().getDay() // 0 = Sun
  return d === 0 ? 6 : d - 1   // shift to Mon = 0 … Sun = 6
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-36 gap-4">
      <Loader2 size={30} className="text-orange-500 animate-spin" />
      <p className="text-gray-400 text-sm">Loading your plan…</p>
    </div>
  )
}

// ─── AI generating animation ──────────────────────────────────────────────────

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-36 gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center">
          <Dumbbell size={36} className="text-orange-500" />
        </div>
        <span className="absolute -inset-2 rounded-3xl border border-orange-500/40 animate-ping" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-base">AI is building your plan…</p>
        <p className="text-gray-500 text-sm">This usually takes 15–25 seconds</p>
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-orange-500/70 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Empty / error state ──────────────────────────────────────────────────────

function EmptyState({ onGenerate, error }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-2">
      <div className="w-full bg-gray-900 border border-white/[0.07] rounded-2xl p-8 flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Dumbbell size={32} className="text-orange-500" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-white font-bold text-xl">No Workout Plan Yet</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Let AI build a personalized plan for you
          </p>
        </div>

        {error && (
          <div className="w-full flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-left">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed">{error}</p>
          </div>
        )}

        <button
          onClick={onGenerate}
          className="relative w-full group overflow-hidden bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white font-semibold py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.35)] hover:shadow-[0_0_28px_rgba(249,115,22,0.5)]"
        >
          <Zap size={16} />
          Generate My Plan
        </button>
      </div>
    </div>
  )
}

// ─── Day pill tab ─────────────────────────────────────────────────────────────

function DayPill({ label, active, isRest, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1.5 px-3.5 py-2.5 rounded-xl shrink-0 transition-all duration-150',
        active
          ? 'bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.4)]'
          : 'bg-gray-900 border border-white/[0.07] hover:border-white/[0.15]',
      ].join(' ')}
    >
      <span className={`text-[11px] font-bold ${active ? 'text-white' : 'text-gray-400'}`}>
        {label}
      </span>
      <span className={[
        'w-1.5 h-1.5 rounded-full',
        active ? 'bg-white/70' : isRest ? 'bg-gray-700' : 'bg-orange-500/50',
      ].join(' ')} />
    </button>
  )
}

// ─── Exercise card ────────────────────────────────────────────────────────────

function ExerciseCard({ ex }) {
  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <p className="text-white font-medium text-sm leading-snug">{ex.name}</p>
        <span className="shrink-0 bg-orange-500/15 text-orange-400 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {ex.sets} × {ex.reps}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {ex.rest && (
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-gray-600" />
            <span className="text-xs text-gray-500">Rest {ex.rest}</span>
          </div>
        )}
        {ex.notes && (
          <p className="text-xs text-gray-600 leading-snug">{ex.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─── Plan weekly view ─────────────────────────────────────────────────────────

function PlanView({ plan, activeDay, onDaySelect }) {
  const day = plan.days?.[activeDay]

  return (
    <div className="space-y-5">
      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
        {DAY_LABELS.map((label, i) => (
          <DayPill
            key={label}
            label={label}
            active={activeDay === i}
            isRest={plan.days?.[i]?.isRest ?? false}
            onClick={() => onDaySelect(i)}
          />
        ))}
      </div>

      {day ? (
        <div className="space-y-4">
          {/* Day header card */}
          <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-1">
                  {DAY_LABELS[activeDay]}day
                </p>
                <h2 className="text-white font-bold text-xl">
                  {day.isRest ? 'Rest Day' : (day.focus || 'Workout')}
                </h2>
              </div>
              <div className={[
                'w-12 h-12 rounded-xl flex items-center justify-center',
                day.isRest
                  ? 'bg-gray-800 border border-white/[0.06]'
                  : 'bg-orange-500/10 border border-orange-500/20',
              ].join(' ')}>
                {day.isRest
                  ? <Moon size={20} className="text-gray-500" />
                  : <Dumbbell size={20} className="text-orange-400" />
                }
              </div>
            </div>

            {!day.isRest && (
              <div className="mt-4 flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] self-start rounded-full px-3 py-1 w-fit">
                <RotateCcw size={11} className="text-gray-500" />
                <span className="text-xs text-gray-400">{day.exercises?.length ?? 0} exercises</span>
              </div>
            )}
          </div>

          {/* Rest day message */}
          {day.isRest && (
            <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-7 flex flex-col items-center text-center gap-3">
              <Moon size={28} className="text-gray-600" />
              <div>
                <p className="text-gray-300 font-medium text-sm">Recovery day</p>
                <p className="text-gray-600 text-xs mt-1">
                  Rest is where gains are made. Stay hydrated and sleep well.
                </p>
              </div>
            </div>
          )}

          {/* Exercise list */}
          {!day.isRest && day.exercises?.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Exercises</p>
              {day.exercises.map((ex, idx) => (
                <ExerciseCard key={idx} ex={ex} />
              ))}
            </div>
          )}

          {/* Start Workout CTA */}
          {!day.isRest && (
            <button className="w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white font-semibold py-4 rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_28px_rgba(249,115,22,0.45)] mt-1">
              <Play size={16} fill="currentColor" />
              Start Workout
            </button>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-6 text-center">
          <p className="text-gray-500 text-sm">No data for this day.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Workout() {
  const { user } = useAuth()

  const [plan, setPlan]         = useState(null)
  const [status, setStatus]     = useState('loading') // loading | empty | generating | ready | error
  const [error, setError]       = useState('')
  const [activeDay, setActiveDay] = useState(getTodayIndex())

  useEffect(() => {
    if (!user) return
    loadPlan()
  }, [user])

  async function loadPlan() {
    setStatus('loading')
    try {
      const { data } = await axios.get(`${API}/workout-plan/${user.id}`)
      if (data?.days?.length) {
        setPlan(data)
        setStatus('ready')
      } else {
        setStatus('empty')
      }
    } catch (err) {
      // 404 = no plan yet (expected)
      if (err.response?.status === 404) {
        setStatus('empty')
      } else {
        setError(err.response?.data?.message || err.message)
        setStatus('error')
      }
    }
  }

  async function handleGenerate() {
    setStatus('generating')
    setError('')
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('goal, experience, equipment, training_days, injuries')
        .eq('id', user.id)
        .maybeSingle()

      if (profileErr) throw new Error(profileErr.message)

      const { data } = await axios.post(`${API}/generate-workout-plan`, {
        userId:      user.id,
        goal:        profile.goal,
        experience:  profile.experience,
        equipment:   profile.equipment,
        daysPerWeek: profile.training_days,
        injuries:    profile.injuries || '',
      })

      setPlan(data)
      setStatus('ready')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-24 overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-orange-500/[0.05] blur-[90px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Workout</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your training plan</p>
      </header>

      <div className="relative z-10 px-5">
        {status === 'loading'    && <LoadingState />}
        {status === 'generating' && <GeneratingState />}
        {(status === 'empty' || status === 'error') && (
          <EmptyState onGenerate={handleGenerate} error={status === 'error' ? error : null} />
        )}
        {status === 'ready' && plan && (
          <PlanView plan={plan} activeDay={activeDay} onDaySelect={setActiveDay} />
        )}
      </div>

      <BottomNav />
    </div>
  )
}
