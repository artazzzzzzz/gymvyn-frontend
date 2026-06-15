import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../utils/api'
import { supabase } from '../utils/supabase'
import {
  Trophy, Dumbbell, Play, ChevronRight, X,
  Flame, TrendingUp, BarChart3, Calendar, BookOpen,
} from 'lucide-react'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'

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
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString())     return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatShortDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatDuration(mins) {
  if (!mins) return '—'
  if (mins < 60) return `${mins}min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function countSets(exercises) {
  return (exercises || []).reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)
}

function workoutInitials(name) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'WO'
}

function workoutColor(name) {
  const n = name?.toLowerCase() || ''
  if (n.includes('push'))  return { bg: '#E6F1FB', text: '#185FA5' }
  if (n.includes('pull'))  return { bg: '#EAF3DE', text: '#3B6D11' }
  if (n.includes('leg'))   return { bg: '#FAEEDA', text: '#854F0B' }
  return { bg: '#F1EFE8', text: '#5F5E5A' }
}

function startOfWeek() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Section label ────────────────────────────────────────────────────────────

const SL = {
  fontSize: 11, fontWeight: 600, color: '#999',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  marginBottom: 10,
}

// ─── Day status ───────────────────────────────────────────────────────────────

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

  // ── New state ─────────────────────────────────────────────────────────────
  const [recentLogs,   setRecentLogs]   = useState([])
  const [weekLogs,     setWeekLogs]     = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)

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

  // Day progress % for trainer plan
  const progressPct = trainerPlan
    ? Math.round(((trainerDayIndex + 1) / (trainerPlan.plan_data?.days?.length || 1)) * 100)
    : 0

  return (
    <div className="min-h-screen overflow-x-hidden pb-32" style={{ background: '#F7F7F5' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ paddingTop: 56, paddingLeft: 20, paddingRight: 20, paddingBottom: 4 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, color: '#111111' }}>Workout</h1>
        <p style={{ fontSize: 13, color: '#999999', marginTop: 2 }}>Track, improve, repeat</p>
        <div style={{ height: 2, background: '#111111', marginTop: 16, marginBottom: 20, borderRadius: 1 }} />
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 1. TRAINER PLAN ────────────────────────────────── */}
        {trainerPlan && (
          <div>
            <p style={SL}>TRAINER PLAN</p>
            <div style={{ background: 'white', borderRadius: 12, borderTop: '3px solid #185FA5', borderRight: '0.5px solid rgba(0,0,0,0.08)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', borderLeft: '0.5px solid rgba(0,0,0,0.08)', padding: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111111' }}>{trainerPlan.name}</p>
              {trainerPlan.notes && <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{trainerPlan.notes}</p>}

              {/* Progress bar */}
              <div style={{ marginTop: 10, marginBottom: 14 }}>
                <div style={{ height: 6, background: '#F0F0EE', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: '#B5D4F4', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Day {trainerDayIndex + 1} of {trainerPlan.plan_data?.days?.length || 1}</p>
              </div>

              {/* Day rows */}
              {(trainerPlan.plan_data?.days || []).map((day, i) => {
                const status = getPlanDayStatus(i, trainerPlan, weekLogs)
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
                      background: isToday ? '#111111' : 'transparent',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 14, fontWeight: isToday ? 500 : 400, color: isToday ? 'white' : isDone ? '#999' : isMissed ? '#E24B4A' : '#111' }}>
                        {day.name || `Day ${i + 1}`}
                      </p>
                      <p style={{ fontSize: 12, color: isToday ? 'rgba(255,255,255,0.6)' : '#999', marginTop: 1 }}>
                        {day.exercises?.length || 0} exercises
                      </p>
                    </div>
                    {isDone   && <span style={{ color: '#3B6D11', fontSize: 16 }}>✓</span>}
                    {isMissed && <span style={{ color: '#E24B4A', fontSize: 14 }}>✕</span>}
                    {!isDone && !isMissed && !isToday && <ChevronRight size={16} color="#C0C0C0" />}
                    {isToday  && <span style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>Start →</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 2. MY PLANS ────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ ...SL, marginBottom: 0 }}>MY PLANS</p>
            <button
              onClick={() => navigate('/workout/plans/new')}
              style={{ fontSize: 13, fontWeight: 500, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              + New
            </button>
          </div>

          {userPlans.length === 0 ? (
            <button
              onClick={() => navigate('/workout/plans/new')}
              style={{ width: '100%', padding: '16px', background: 'white', border: '0.5px dashed rgba(0,0,0,0.2)', borderRadius: 10, color: '#999', fontSize: 14, cursor: 'pointer', textAlign: 'center' }}
            >
              + Create your first workout plan
            </button>
          ) : (
            /* Horizontal scroll */
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {userPlans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{ width: 160, flexShrink: 0, background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 14, cursor: 'pointer' }}
                >
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#111', lineHeight: 1.3 }}>{plan.name}</p>
                  <p style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    {plan.plan_data?.days?.length || 0} days
                  </p>
                  <p style={{ fontSize: 12, color: '#999' }}>
                    {(plan.plan_data?.days || []).reduce((s, d) => s + (d.exercises?.length || 0), 0)} exercises
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. QUICK START ─────────────────────────────────── */}
        <div>
          <p style={SL}>QUICK START</p>
          {[
            {
              label: 'Empty workout',
              sub: 'Start from scratch',
              icon: <span style={{ fontSize: 18 }}>⚡</span>,
              onClick: () => navigate('/workout/live', { state: { exercises: [], empty: true } }),
            },
            {
              label: 'Exercise library',
              sub: 'Browse all exercises',
              icon: <span style={{ fontSize: 18 }}>📚</span>,
              onClick: () => navigate('/exercise-library'),
            },
            ...(recentLogs[0] ? [{
              label: 'Repeat last workout',
              sub: formatDate(recentLogs[0].started_at),
              icon: <span style={{ fontSize: 18 }}>🔁</span>,
              onClick: () => navigate('/workout/live', { state: { exercises: recentLogs[0].exercises || [], isRepeat: true } }),
            }] : []),
          ].map((item, i) => (
            <div
              key={i}
              onClick={item.onClick}
              style={{
                background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10,
                height: 52, padding: '0 16px', display: 'flex', alignItems: 'center',
                gap: 12, marginBottom: 8, cursor: 'pointer',
              }}
            >
              {item.icon}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{item.label}</p>
              </div>
              <ChevronRight size={16} color="#C0C0C0" />
            </div>
          ))}
        </div>

        {/* ── 4. RECENT WORKOUTS ─────────────────────────────── */}
        {recentLogs.length > 0 && (
          <div>
            <p style={SL}>RECENT WORKOUTS</p>
            <div style={{ background: 'white', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
              {recentLogs.map((w, i) => {
                const color = workoutColor(w.notes)
                const initials = workoutInitials(w.notes || 'Workout')
                const sets = countSets(w.exercises)
                return (
                  <div
                    key={w.id || i}
                    style={{
                      height: 60, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
                      borderBottom: i < recentLogs.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>{initials}</span>
                    </div>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {w.notes && w.notes !== 'Rest day' ? w.notes : 'Workout'}
                      </p>
                      <p style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
                        {formatDate(w.started_at)} · {sets} sets · {formatDuration(w.duration_minutes)}
                      </p>
                    </div>
                    <ChevronRight size={14} color="#C0C0C0" />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Plan day bottom sheet ─────────────────────────────── */}
      {selectedPlan && (
        <div style={{ marginTop: 20, background: 'white', borderRadius: '16px 16px 0 0', border: '0.5px solid rgba(0,0,0,0.1)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{selectedPlan.name}</span>
            <button onClick={() => setSelectedPlan(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#999', lineHeight: 1 }}>×</button>
          </div>
          {(selectedPlan.plan_data?.days || []).map((day, i) => (
            <div
              key={i}
              onClick={() => {
                navigate('/workout/live', { state: { exercises: day.exercises, planName: selectedPlan.name, dayName: day.name } })
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '0.5px solid rgba(0,0,0,0.06)', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{day.name || `Day ${i + 1}`}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{day.exercises?.length || 0} exercises</div>
              </div>
              <ChevronRight size={16} color="#C0C0C0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
