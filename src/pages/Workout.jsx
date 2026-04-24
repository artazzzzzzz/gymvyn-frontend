import { useEffect, useState } from 'react'
import {
  Dumbbell, Zap, Clock, RotateCcw, Play, Moon, Loader2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import BottomNav from '../components/BottomNav'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getTodayIndex() {
  const jsDay = new Date().getDay() // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1 // shift to Mon=0…Sun=6
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 size={28} className="text-orange-500 animate-spin" />
      <p className="text-zinc-500 text-sm">Loading your plan…</p>
    </div>
  )
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5">
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <Dumbbell size={32} className="text-orange-500" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border border-orange-500/30 animate-ping" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">AI is building your plan…</p>
        <p className="text-zinc-500 text-sm mt-1">This usually takes 10–20 seconds</p>
      </div>
      <div className="flex gap-1.5 mt-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-orange-500/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onGenerate, error }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-5">
          <Dumbbell size={28} className="text-orange-500" />
        </div>
        <h2 className="text-white font-semibold text-lg mb-1">No workout plan yet</h2>
        <p className="text-zinc-500 text-sm mb-7">
          Let our AI build a personalised 7-day programme based on your goals and fitness level.
        </p>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-left">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-xs">{error}</p>
          </div>
        )}

        <button
          onClick={onGenerate}
          className="w-full relative group overflow-hidden bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white font-semibold py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2"
        >
          {/* glow ring */}
          <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_24px_4px_rgba(249,115,22,0.45)]" />
          <Zap size={16} />
          Generate My Plan
        </button>
      </div>
    </div>
  )
}

function DayPill({ label, active, isRest, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl transition-all duration-150 shrink-0 ${
        active
          ? 'bg-orange-500 text-white shadow-[0_0_16px_2px_rgba(249,115,22,0.35)]'
          : 'bg-[#141416] border border-white/[0.06] text-zinc-500 hover:border-white/[0.14]'
      }`}
    >
      <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-zinc-400'}`}>
        {label}
      </span>
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          active ? 'bg-white/70' : isRest ? 'bg-zinc-700' : 'bg-orange-500/60'
        }`}
      />
    </button>
  )
}

function ExerciseCard({ exercise }) {
  return (
    <div className="bg-[#1c1c1f] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-white font-medium text-sm leading-snug">{exercise.name}</p>
        <span className="shrink-0 text-xs font-semibold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full">
          {exercise.sets} × {exercise.reps}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {exercise.rest && (
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-zinc-600" />
            <span className="text-xs text-zinc-500">Rest {exercise.rest}</span>
          </div>
        )}
        {exercise.notes && (
          <p className="text-xs text-zinc-600 truncate">{exercise.notes}</p>
        )}
      </div>
    </div>
  )
}

function PlanView({ plan, activeDay, onDaySelect }) {
  const day = plan?.days?.[activeDay]

  return (
    <div className="space-y-5">
      {/* Day pills row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
        {DAY_LABELS.map((label, i) => {
          const dayData = plan?.days?.[i]
          return (
            <DayPill
              key={label}
              label={label}
              active={activeDay === i}
              isRest={dayData?.isRest ?? false}
              onClick={() => onDaySelect(i)}
            />
          )
        })}
      </div>

      {/* Day detail card */}
      {day ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-1">
                  {DAY_LABELS[activeDay]}day
                </p>
                <h2 className="text-white font-bold text-lg leading-tight">
                  {day.isRest ? 'Rest Day' : (day.focus ?? 'Workout')}
                </h2>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                day.isRest
                  ? 'bg-zinc-800 border border-white/[0.06]'
                  : 'bg-orange-500/10 border border-orange-500/20'
              }`}>
                {day.isRest
                  ? <Moon size={20} className="text-zinc-500" />
                  : <Dumbbell size={20} className="text-orange-400" />
                }
              </div>
            </div>

            {!day.isRest && (
              <div className="flex items-center gap-2 mt-4">
                <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1">
                  <RotateCcw size={11} className="text-zinc-500" />
                  <span className="text-xs text-zinc-400">
                    {day.exercises?.length ?? 0} exercises
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rest day message */}
          {day.isRest && (
            <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 text-center">
              <Moon size={28} className="text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm font-medium">Recovery day</p>
              <p className="text-zinc-600 text-xs mt-1">
                Rest is where gains are made. Stay hydrated and get good sleep.
              </p>
            </div>
          )}

          {/* Exercise list */}
          {!day.isRest && day.exercises?.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Exercises
              </p>
              {day.exercises.map((ex, idx) => (
                <ExerciseCard key={idx} exercise={ex} />
              ))}
            </div>
          )}

          {/* Start Workout button */}
          {!day.isRest && (
            <button className="w-full relative group overflow-hidden bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white font-semibold py-4 rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 mt-2">
              <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_24px_4px_rgba(249,115,22,0.4)]" />
              <Play size={16} fill="currentColor" />
              Start Workout
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-6 text-center">
          <p className="text-zinc-500 text-sm">No data for this day.</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Workout() {
  const { user } = useAuth()

  const [plan, setPlan]       = useState(null)
  const [status, setStatus]   = useState('loading') // 'loading'|'empty'|'generating'|'ready'|'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [activeDay, setActiveDay] = useState(getTodayIndex())

  useEffect(() => {
    if (!user) return
    fetchPlan()
  }, [user])

  async function fetchPlan() {
    setStatus('loading')
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/workout-plan/${user.id}`,
      )
      if (res.status === 404 || res.status === 204) {
        setStatus('empty')
        return
      }
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const data = await res.json()
      if (!data || !data.days) {
        setStatus('empty')
        return
      }
      setPlan(data)
      setStatus('ready')
    } catch {
      setStatus('empty')
    }
  }

  async function handleGenerate() {
    setStatus('generating')
    setErrorMsg('')
    try {
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileErr) throw new Error(profileErr.message)

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/generate-workout-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, ...profile }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `Server error ${res.status}`)
      }

      const data = await res.json()
      setPlan(data)
      setStatus('ready')
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-24 overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-orange-500/[0.06] blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Workout</h1>
        <p className="text-zinc-500 text-sm mt-1">Your training plan</p>
      </header>

      <div className="relative z-10 px-5">
        {status === 'loading'     && <LoadingState />}
        {status === 'generating'  && <GeneratingState />}
        {(status === 'empty' || status === 'error') && (
          <EmptyState
            onGenerate={handleGenerate}
            error={status === 'error' ? errorMsg : null}
          />
        )}
        {status === 'ready' && plan && (
          <PlanView
            plan={plan}
            activeDay={activeDay}
            onDaySelect={setActiveDay}
          />
        )}
      </div>

      <BottomNav />
    </div>
  )
}
