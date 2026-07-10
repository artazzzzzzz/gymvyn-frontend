import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../utils/api'
import { supabase } from '../utils/supabase'
import {
  Play, Zap, BookOpen, RotateCcw,
  Layers, Dumbbell, ChevronRight, ArrowRight,
} from 'lucide-react'
import PrimaryButton from '../components/PrimaryButton'
import AIPlanGenerator from '../components/AIPlanGenerator'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatVolume = (exercises) => {
  if (!exercises) return '0 kg'
  let total = 0
  exercises.forEach(ex => {
    ex.sets?.forEach(s => {
      total += parseFloat(s.weight_kg || s.kg || 0) * parseInt(s.reps_completed || s.reps || 0)
    })
  })
  return total > 1000
    ? (total / 1000).toFixed(1) + 't'
    : Math.round(total) + ' kg'
}

function computeSets(exercises) {
  return (exercises || []).reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)
}

function exerciseNames(exercises) {
  if (!exercises) return []
  return exercises.map(ex => ex.name || ex.exerciseName || '').filter(Boolean)
}

function formatDuration(mins) {
  if (!mins) return '—'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatShortDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function stripeColor(workoutName) {
  const n = (workoutName || '').toLowerCase()
  if (n.includes('push') || n.includes('chest') || n.includes('upper')) return 'var(--error)'
  if (n.includes('leg') || n.includes('lower') || n.includes('squat') || n.includes('deadlift')) return '#F6C244'
  if (n.includes('pull') || n.includes('back') || n.includes('row')) return '#5B8FF9'
  return null
}

function getPlanDayStatus(dayIndex, plan, weekLogs) {
  const startDate = new Date(plan.starts_at || plan.created_at)
  const daysSince = Math.floor((Date.now() - startDate) / 86400000)
  const totalDays = plan.plan_data?.days?.length || 1
  const currentDayIndex = daysSince % totalDays
  if (dayIndex < currentDayIndex) {
    const logExists = (weekLogs || []).some(l => {
      const logDay = Math.floor((new Date(l.started_at) - startDate) / 86400000) % totalDays
      return logDay === dayIndex
    })
    return logExists ? 'done' : 'missed'
  }
  if (dayIndex === currentDayIndex) return 'today'
  return 'upcoming'
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Workout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    recentWorkouts, personalRecords, totalWorkouts, totalVolume,
    thisWeekWorkouts, longestStreak, loading, error,
  } = useWorkoutHistory()

  // ── Existing state ────────────────────────────────────────────────────────
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [trainerPlan,     setTrainerPlan]     = useState(null)
  const [userPlans,       setUserPlans]       = useState([])

  // ── Existing + new state ──────────────────────────────────────────────────
  const [recentLogs,   setRecentLogs]   = useState([])
  const [weekLogs,     setWeekLogs]     = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showAIBuilder, setShowAIBuilder] = useState(false)
  const [workoutLogs,  setWorkoutLogs]  = useState([])

  // ── Existing fetch logic ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const fetchTrainerPlan = async () => {
      try {
        const plans = await apiFetch(`/api/trainer/assigned-plans/${user.id}?type=workout&status=active`)
        if (plans?.length > 0) setTrainerPlan(plans[0])
      } catch { /* non-critical */ }
    }
    const fetchUserPlans = async () => {
      try {
        const plans = await apiFetch(`/api/user-plans/${user.id}`)
        setUserPlans(plans || [])
      } catch (err) { console.error(err) }
    }
    const fetchWeekLogs = async () => {
      try {
        const { data } = await supabase
          .from('workout_logs')
          .select('started_at, notes')
          .eq('user_id', user.id)
          .gte('started_at', startOfWeek().toISOString())
        setWeekLogs(data || [])
      } catch { /* non-critical */ }
    }
    fetchTrainerPlan()
    fetchUserPlans()
    fetchWeekLogs()
  }, [user?.id])

  // Sync recentLogs from hook
  useEffect(() => {
    setRecentLogs(recentWorkouts.slice(0, 4))
  }, [recentWorkouts])

  // ── New: explicit workout_logs fetch with full exercises JSONB ────────────
  useEffect(() => {
    if (!user?.id) return
    const fetchRecentWorkoutLogs = async () => {
      const { data } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5)
      setWorkoutLogs(data || [])
    }
    fetchRecentWorkoutLogs()
  }, [user?.id])

  const topPRs = useMemo(() =>
    Object.values(personalRecords)
      .filter(pr => pr.maxWeight > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6),
    [personalRecords]
  )

  // Trainer plan current day index
  const trainerDayIndex = trainerPlan ? (() => {
    const start = new Date(trainerPlan.starts_at || trainerPlan.created_at)
    const days  = trainerPlan.plan_data?.days?.length || 1
    return Math.floor((Date.now() - start) / 86400000) % days
  })() : 0

  const progressPct = trainerPlan
    ? Math.round(((trainerDayIndex + 1) / (trainerPlan.plan_data?.days?.length || 1)) * 100)
    : 0

  // Last session subtitle (skip rest-day placeholder rows — they aren't sessions)
  const lastLog = workoutLogs.find(w => w.notes !== 'Rest day')
  const lastSessionSub = lastLog
    ? `Last session: ${formatDate(lastLog.completed_at || lastLog.started_at)} · ${computeSets(lastLog.exercises)} sets · ${lastLog.duration_minutes ? lastLog.duration_minutes + ' min' : '—'}`
    : 'No sessions yet'

  async function handleDeletePlan(planId) {
    if (!window.confirm('Delete this plan? This cannot be undone.')) return
    try {
      await apiFetch(`/api/user-plans/${planId}`, { method: 'DELETE' })
      setUserPlans(prev => prev.filter(p => p.id !== planId))
      setSelectedPlan(null)
    } catch (err) {
      console.error('Delete plan failed:', err)
      alert('Failed to delete plan. Please try again.')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowX: 'hidden', paddingBottom: 128 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ padding: '72px 20px 0' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", letterSpacing: '-0.5px', lineHeight: 1 }}>
          Workout
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 5 }}>{lastSessionSub}</p>
      </div>

      {/* ── Start Workout CTA ────────────────────────────────── */}
      <PrimaryButton
        onClick={() => navigate('/workout/live')}
        style={{
          width: 'calc(100% - 32px)', margin: '20px 16px 0', height: 56,
          letterSpacing: '-0.2px',
        }}
      >
        <Play size={18} color="currentColor" fill="currentColor" stroke="none" />
        Start Workout
      </PrimaryButton>

      {/* ── Trainer Plan ─────────────────────────────────────── */}
      {trainerPlan && (
        <div style={{ margin: '20px 16px 0' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 0 10px',
          }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: "var(--text-tertiary)" }}>
              TRAINER PLAN
            </span>
          </div>
          <div style={{
            background: "var(--bg-card)", borderRadius: 14, padding: 16,
            border: '1px solid var(--border)', borderTop: '3px solid var(--text-cta)',
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{trainerPlan.name}</p>
            {trainerPlan.notes && (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{trainerPlan.notes}</p>
            )}
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: "var(--text-primary)", borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
              Day {trainerDayIndex + 1} of {trainerPlan.plan_data?.days?.length || 1}
            </p>
            {(trainerPlan.plan_data?.days || []).map((day, i) => {
              const status  = getPlanDayStatus(i, trainerPlan, weekLogs)
              const isToday = status === 'today'
              const isDone  = status === 'done'
              const isMissed = status === 'missed'
              return (
                <div
                  key={i}
                  onClick={() => isToday && navigate('/workout/live', {
                    state: { exercises: day.exercises, planName: trainerPlan.name, dayName: day.name || `Day ${i + 1}`, planId: trainerPlan.id, dayIndex: i }
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, margin: '4px 0',
                    cursor: isToday ? 'pointer' : 'default',
                    background: isToday ? "var(--text-primary)" : 'transparent',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: isToday ? 500 : 400, color: isToday ? 'var(--bg-primary)' : isDone ? "var(--text-tertiary)" : isMissed ? '#E24B4A' : "var(--text-primary)" }}>
                      {day.name || `Day ${i + 1}`}
                    </p>
                    <p style={{ fontSize: 12, color: isToday ? 'var(--bg-primary)' : "var(--text-tertiary)", opacity: isToday ? 0.6 : 1, marginTop: 1 }}>
                      {day.exercises?.length || 0} exercises
                    </p>
                  </div>
                  {isDone    && <ChevronRight size={14} color="var(--success)" />}
                  {isMissed  && <ChevronRight size={14} color="#E24B4A" />}
                  {!isDone && !isMissed && !isToday && <ChevronRight size={16} color="var(--text-tertiary)" />}
                  {isToday   && <span style={{ fontSize: 13, color: 'var(--bg-primary)', fontWeight: 500 }}>Start →</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── My Plans ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: "var(--text-tertiary)" }}>MY PLANS</span>
        <button
          onClick={() => navigate('/workout/plans/new')}
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          + New
        </button>
      </div>

      {userPlans.length === 0 ? (
        <div style={{
          background: "var(--bg-card)", borderRadius: 14, margin: '0 16px', padding: '24px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          border: '1px solid var(--bg-pill)',
        }}>
          <Dumbbell size={24} color="var(--text-tertiary)" />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginTop: 8 }}>No plans yet</p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
            Create a plan to stay consistent with your training.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => navigate('/workout/plans/new')}
              style={{
                border: '1px solid var(--text-primary)', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                background: 'none', cursor: 'pointer',
              }}
            >
              Create plan
            </button>
            <button
              onClick={() => setShowAIBuilder(true)}
              style={{
                border: 'none', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
                background: 'var(--bg-pill)', cursor: 'pointer',
              }}
            >
              Build with AI →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 10, padding: '0 16px 2px', width: 'max-content' }}>
            {userPlans.map(plan => {
              const totalDays = plan.plan_data?.days?.length || 1
              const start = new Date(plan.starts_at || plan.created_at)
              const daysSince = Math.max(0, Math.floor((Date.now() - start) / 86400000))
              const currentDay = daysSince % totalDays
              const pct = Math.round(((currentDay + 1) / totalDays) * 100)
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    background: "var(--bg-card)", borderRadius: 14, padding: 16,
                    width: 160, flexShrink: 0, border: '1px solid var(--bg-pill)', cursor: 'pointer',
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{plan.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}>
                    {totalDays} day{totalDays !== 1 ? 's' : ''} / week
                  </p>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: "var(--text-primary)", borderRadius: 2 }} />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
                    Day {currentDay + 1} of {totalDays}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quick Start ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: "var(--text-tertiary)" }}>QUICK START</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>

        {/* Empty Workout — primary CTA */}
        <PrimaryButton
          onClick={() => navigate('/workout/live', { state: { exercises: [], empty: true } })}
          style={{
            gridColumn: '1 / -1', borderRadius: 16, height: 'auto', padding: 16,
            justifyContent: 'flex-start',
          }}
        >
          <Zap size={20} strokeWidth={2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Empty Workout</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Start from scratch</div>
          </div>
          <ArrowRight size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
        </PrimaryButton>

        {/* Exercise Library — light half */}
        <button
          onClick={() => navigate('/exercise-library')}
          style={{
            background: "var(--bg-card)", border: '1px solid var(--border)', borderRadius: 14,
            padding: 16, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <BookOpen size={20} color="var(--text-primary)" strokeWidth={2} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 8 }}>Library</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>Browse exercises</div>
        </button>

        {/* Repeat Last — light half */}
        <button
          onClick={() => recentLogs[0] && navigate('/workout/live', { state: { exercises: recentLogs[0].exercises || [], isRepeat: true } })}
          style={{
            background: "var(--bg-card)", border: '1px solid var(--border)', borderRadius: 14,
            padding: 16, cursor: recentLogs[0] ? 'pointer' : 'default', textAlign: 'left',
            opacity: recentLogs[0] ? 1 : 0.5,
          }}
        >
          <RotateCcw size={20} color="var(--text-primary)" strokeWidth={2} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 8 }}>Repeat Last</div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>
            {recentLogs[0] ? formatDate(recentLogs[0].started_at) + "'s session" : 'No session yet'}
          </div>
        </button>

      </div>

      {/* ── Recent Workouts ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '20px 16px 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', color: "var(--text-tertiary)" }}>RECENT WORKOUTS</span>
      </div>

      {workoutLogs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 16px' }}>
          <Layers size={28} color="var(--text-tertiary)" strokeWidth={1.5} />
          <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginTop: 8 }}>No workouts yet</p>
        </div>
      ) : (
        workoutLogs.map(workout => {
          const date = formatDate(workout.completed_at || workout.started_at)

          // Rest days aren't workouts — reuse Home.jsx's rest-day treatment
          // (plain label, no fake sets/volume/duration stats) instead of the
          // full workout card.
          if (workout.notes === 'Rest day') {
            return (
              <div
                key={workout.id}
                style={{
                  background: "var(--bg-card)", borderRadius: 14,
                  margin: '0 16px 10px', padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-tertiary)" }}>Rest day</span>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)", flexShrink: 0, marginLeft: 8 }}>{date}</span>
                </div>
              </div>
            )
          }

          const name    = workout.notes || 'Workout'
          const sets    = computeSets(workout.exercises)
          const vol     = formatVolume(workout.exercises)
          const dur     = formatDuration(workout.duration_minutes)
          const names   = exerciseNames(workout.exercises)
          const stripe  = stripeColor(name)
          const first3  = names.slice(0, 3)
          const overflow = names.length > 3 ? names.length - 3 : 0

          return (
            <div
              key={workout.id}
              style={{
                background: "var(--bg-card)", borderRadius: 14,
                margin: '0 16px 10px', padding: 16,
                boxShadow: stripe
                  ? `inset 3px 0 0 0 ${stripe}, 0 1px 4px rgba(0,0,0,0.05)`
                  : '0 1px 4px rgba(0,0,0,0.05)',
                cursor: 'pointer',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>
                <span style={{ fontSize: 13, color: "var(--text-tertiary)", flexShrink: 0, marginLeft: 8 }}>{date}</span>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                {[
                  { val: sets || '—', lbl: 'sets' },
                  { val: vol,         lbl: 'kg vol.' },
                  { val: dur,         lbl: 'min' },
                ].map(({ val, lbl }) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3 }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {/* Exercise pills */}
              {first3.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {first3.map((n, i) => (
                    <span
                      key={i}
                      style={{
                        background: 'var(--bg-primary)', borderRadius: 8, padding: '4px 10px',
                        fontSize: 12, color: "var(--text-secondary)",
                      }}
                    >
                      {n}
                    </span>
                  ))}
                  {overflow > 0 && (
                    <span style={{
                      background: "var(--text-primary)", borderRadius: 8, padding: '4px 10px',
                      fontSize: 12, color: "var(--bg-card)",
                    }}>
                      +{overflow} more
                    </span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bg-pill)' }}>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/workout/summary/${workout.id}`) }}
                  style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  View full summary →
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* ── Plan day bottom sheet ─────────────────────────────── */}
      {selectedPlan && (
        <>
          <div
            onClick={() => setSelectedPlan(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
            background: 'var(--bg-card)', borderRadius: '16px 16px 0 0', padding: '20px 20px 40px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>{selectedPlan.name}</span>
              <button
                onClick={() => { navigate(`/workout/plans/${selectedPlan.id}/edit`); setSelectedPlan(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 4 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                onClick={() => handleDeletePlan(selectedPlan.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', display: 'flex', padding: 4 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
              <button onClick={() => setSelectedPlan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-tertiary)", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            {(selectedPlan.plan_data?.days || []).map((day, i) => (
              <div
                key={i}
                onClick={() => {
                  navigate('/workout/live', { state: { exercises: day.exercises, planName: selectedPlan.name, dayName: day.name } })
                  setSelectedPlan(null)
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderTop: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{day.name || `Day ${i + 1}`}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{day.exercises?.length || 0} exercises</div>
                </div>
                <ChevronRight size={16} color="var(--text-tertiary)" />
              </div>
            ))}
          </div>
        </>
      )}

      {showAIBuilder && <AIPlanGenerator onClose={() => setShowAIBuilder(false)} />}
    </div>
  )
}
