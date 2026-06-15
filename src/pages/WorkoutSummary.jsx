import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Trophy, Clock, Layers, Dumbbell, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

// ─── Mock data (used when navigated directly without state) ───────────────────

const mockExercises = [
  { exerciseId: '1', exerciseName: 'Bench Press', muscleGroup: 'Chest · Triceps', sets: [
    { setNumber:1, weight:60, reps:10, previousKg:60, previousReps:10 },
    { setNumber:2, weight:62, reps:9,  previousKg:60, previousReps:10 },
    { setNumber:3, weight:65, reps:8,  previousKg:62, previousReps:8  },
    { setNumber:4, weight:65, reps:7,  previousKg:62, previousReps:8  },
    { setNumber:5, weight:60, reps:9,  previousKg:60, previousReps:10 },
  ]},
  { exerciseId: '2', exerciseName: 'Incline DB Press', muscleGroup: 'Chest · Shoulders', sets: [
    { setNumber:1, weight:24, reps:10, previousKg:22, previousReps:10 },
    { setNumber:2, weight:24, reps:10, previousKg:22, previousReps:10 },
    { setNumber:3, weight:24, reps:9,  previousKg:22, previousReps:10 },
    { setNumber:4, weight:24, reps:8,  previousKg:22, previousReps:10 },
  ]},
  { exerciseId: '3', exerciseName: 'Cable Fly', muscleGroup: 'Chest', sets: [
    { setNumber:1, weight:15, reps:14, previousKg:15, previousReps:12 },
    { setNumber:2, weight:15, reps:13, previousKg:15, previousReps:12 },
    { setNumber:3, weight:15, reps:12, previousKg:15, previousReps:12 },
  ]},
  { exerciseId: '4', exerciseName: 'Overhead Press', muscleGroup: 'Shoulders', sets: [
    { setNumber:1, weight:40,   reps:8, previousKg:37.5, previousReps:8 },
    { setNumber:2, weight:40,   reps:7, previousKg:37.5, previousReps:8 },
    { setNumber:3, weight:37.5, reps:8, previousKg:37.5, previousReps:8 },
    { setNumber:4, weight:37.5, reps:7, previousKg:37.5, previousReps:8 },
  ]},
  { exerciseId: '5', exerciseName: 'Lateral Raise', muscleGroup: 'Shoulders', sets: [
    { setNumber:1, weight:10, reps:15, previousKg:10, previousReps:12 },
    { setNumber:2, weight:10, reps:14, previousKg:10, previousReps:12 },
    { setNumber:3, weight:10, reps:13, previousKg:10, previousReps:12 },
    { setNumber:4, weight:10, reps:12, previousKg:10, previousReps:12 },
  ]},
  { exerciseId: '6', exerciseName: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: [
    { setNumber:1, weight:35,   reps:12, previousKg:32.5, previousReps:12 },
    { setNumber:2, weight:35,   reps:11, previousKg:32.5, previousReps:12 },
    { setNumber:3, weight:32.5, reps:12, previousKg:32.5, previousReps:12 },
  ]},
  { exerciseId: '7', exerciseName: 'Close-Grip Bench', muscleGroup: 'Triceps · Chest', sets: [
    { setNumber:1, weight:50,   reps:10, previousKg:50, previousReps:9 },
    { setNumber:2, weight:50,   reps:9,  previousKg:50, previousReps:9 },
    { setNumber:3, weight:47.5, reps:10, previousKg:50, previousReps:9 },
  ]},
]
const MOCK_DURATION   = 4354
const MOCK_STARTED_AT = new Date(Date.now() - MOCK_DURATION * 1000).toISOString()
const MOCK_PLAN_NAME  = 'Push Day A'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDurationSec(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function formatDateLabel(isoString) {
  if (!isoString) return ''
  const d     = new Date(isoString)
  const today = new Date()
  const prefix = d.toDateString() === today.toDateString()
    ? 'Today'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${prefix} · ${d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })}`
}

function computeMuscles(exercises) {
  const tally = {}
  for (const ex of exercises) {
    for (const m of (ex.muscleGroup || '').split(' · ')) {
      const key = m.trim()
      if (key) tally[key] = (tally[key] || 0) + 1
    }
  }
  const total = Object.values(tally).reduce((s, v) => s + v, 0) || 1
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
}

function computeVolume(exercises) {
  return exercises.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0
  )
}

function getBestSet(sets) {
  return sets.reduce((best, s) => (s.weight * s.reps > (best?.weight ?? 0) * (best?.reps ?? 0) ? s : best), sets[0])
}

function computePRsFromSets(exercises) {
  const prs = []
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (set.previousKg != null && set.weight > set.previousKg) {
        prs.push({
          exerciseName: ex.exerciseName,
          kg: set.weight, reps: set.reps,
          previousKg: set.previousKg, previousReps: set.previousReps,
        })
        break // one PR per exercise
      }
    }
  }
  return prs
}

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

  // ── Existing state ────────────────────────────────────────────────────────
  const [prs, setPrs]           = useState({})
  const [prLoading, setPrLoading] = useState(true)

  // ── New state ─────────────────────────────────────────────────────────────
  const [expandedExercise, setExpandedExercise] = useState(null)
  const [isSaved, setIsSaved]                   = useState(!!summary)

  // ── Resolve data (real or mock) ───────────────────────────────────────────
  const exercises  = summary?.exercises?.length ? summary.exercises : mockExercises
  const durationSec = summary
    ? (summary.durationMinutes ?? 0) * 60
    : MOCK_DURATION
  const startedAt  = summary?.startedAt  ?? MOCK_STARTED_AT
  const planName   = summary?.planName   ?? MOCK_PLAN_NAME

  // ── Set default expanded exercise ────────────────────────────────────────
  useEffect(() => {
    if (exercises.length) setExpandedExercise(exercises[0].exerciseId)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Existing PR-check effect ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || !exercises?.length) {
      setPrLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const result = {}
      try {
        const exerciseIds = exercises.map(e => e.exerciseId)
        const { data } = await supabase
          .from('workout_set_logs')
          .select('exercise_id, weight_kg, workout_log:workout_logs!inner(user_id, started_at)')
          .in('exercise_id', exerciseIds)
          .eq('workout_log.user_id', user.id)
          .lt('workout_log.started_at', startedAt)

        const prevMax = {}
        for (const row of data ?? []) {
          const id = row.exercise_id
          const w  = Number(row.weight_kg) || 0
          if (!(id in prevMax) || w > prevMax[id]) prevMax[id] = w
        }

        for (const ex of exercises) {
          const sessionMax = ex.sets.reduce((m, s) => Math.max(m, s.weight ?? s.weight_kg ?? 0), 0)
          const before = prevMax[ex.exerciseId] ?? 0
          if (sessionMax > 0 && sessionMax > before) {
            result[ex.exerciseId] = { weight: sessionMax, previous: before }
          }
        }
      } catch (err) {
        console.error('[WorkoutSummary] PR check error:', err)
      }
      if (!cancelled) { setPrs(result); setPrLoading(false) }
    })()
    return () => { cancelled = true }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Workout is saved by useWorkoutSession.finishSession() before navigating here.

  // ── Computed values ───────────────────────────────────────────────────────
  const totalSets      = exercises.reduce((s, ex) => s + ex.sets.length, 0)
  const totalVolume    = computeVolume(exercises)
  const muscles        = computeMuscles(exercises)
  const localPRs       = computePRsFromSets(exercises)
  const prCount        = Object.keys(prs).length
  const formattedVol   = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}k`
    : `${Math.round(totalVolume)}`

  // Coach note
  const coachNote = (() => {
    const vol  = totalVolume > 4000 ? 'Strong session.' : 'Solid session.'
    const pr   = localPRs.length > 0 ? ` Hit ${localPRs.length} new PR${localPRs.length > 1 ? 's' : ''} today.` : ''
    const adv  = ' Keep progressive overload consistent — aim to add 2.5 kg or 1 rep on your primary lift next session.'
    return vol + pr + adv
  })()

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#F7F7F5', paddingBottom: 144 }}>

      {/* ── 1. TOP BAR ─────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Workout Complete</span>
        {isSaved && (
          <span style={{ position: 'absolute', right: 20, fontSize: 12, fontWeight: 500, color: '#3B6D11' }}>
            Saved ✓
          </span>
        )}
      </div>

      {/* ── 2. HERO STATS CARD ─────────────────────────────── */}
      <div style={{ paddingTop: 72, paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', padding: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: '#111' }}>{planName}</p>
          <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{formatDateLabel(startedAt)}</p>
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
            {[
              { value: formatDurationSec(durationSec), label: 'TIME' },
              { value: exercises.length,               label: 'EXER.' },
              { value: totalSets,                      label: 'SETS' },
              { value: `${formattedVol}kg`,            label: 'VOL' },
            ].map(({ value, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                <span style={{ fontSize: 22, fontWeight: 500, color: '#111', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginTop: 2 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ── 3. PR SECTION ──────────────────────────────────── */}
        {localPRs.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12 }}>PERSONAL RECORDS</p>
            {localPRs.map((pr, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', padding: 16, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>🏆</span>
                </div>
                <div>
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#FAEEDA', color: '#854F0B', padding: '2px 8px', borderRadius: 20 }}>NEW PR</span>
                  <p style={{ fontSize: 15, fontWeight: 500, color: '#111', marginTop: 4 }}>{pr.exerciseName}</p>
                  <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{pr.kg} kg × {pr.reps} reps</p>
                  <p style={{ fontSize: 12, color: '#CCC', marginTop: 2 }}>Previous best: {pr.previousKg} kg × {pr.previousReps}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 4. EXERCISE BREAKDOWN ──────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 12 }}>EXERCISES</p>
          {exercises.map(ex => {
            const isExpanded   = expandedExercise === ex.exerciseId
            const exVol        = ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0)
            const bestSet      = getBestSet(ex.sets)

            return (
              <div key={ex.exerciseId} style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', marginBottom: 8, overflow: 'hidden' }}>
                {/* Header row */}
                <div
                  onClick={() => setExpandedExercise(isExpanded ? null : ex.exerciseId)}
                  style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>{ex.exerciseName}</span>
                  <span style={{ fontSize: 12, color: '#999' }}>{ex.sets.length} sets · {exVol} kg</span>
                  <span style={{ fontSize: 16, color: '#CCC', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                </div>

                {/* Expanded sets table */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '12px 16px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 8 }}>
                      {['SET', 'KG', 'REPS', 'VOL'].map(h => (
                        <span key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999' }}>{h}</span>
                      ))}
                    </div>
                    {ex.sets.map(set => {
                      const isBest = set === bestSet
                      const isPR   = set.previousKg != null && set.weight > set.previousKg
                      return (
                        <div
                          key={set.setNumber}
                          style={{
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                            padding: '10px 0', fontSize: 13, alignItems: 'center',
                            borderLeft: isBest ? '2px solid #3B6D11' : '2px solid transparent',
                            paddingLeft: isBest ? 8 : 0,
                            background: isBest ? 'rgba(59,109,17,0.03)' : 'transparent',
                            borderRadius: isBest ? '0 6px 6px 0' : 0,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: 12, color: '#999' }}>{set.setNumber}</span>
                          <span style={{ fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {set.weight}
                            {isPR && (
                              <span style={{ fontSize: 9, fontWeight: 500, background: '#EAF3DE', color: '#3B6D11', padding: '1px 5px', borderRadius: 20 }}>PR</span>
                            )}
                          </span>
                          <span style={{ fontWeight: 500, color: '#111' }}>{set.reps}</span>
                          <span style={{ fontSize: 12, color: '#999' }}>{(set.weight || 0) * (set.reps || 0)} kg</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── 5. MUSCLE HEATMAP ──────────────────────────────── */}
        <div style={{ marginTop: 20, background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', padding: 16 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 16 }}>MUSCLES WORKED</p>
          {muscles.map(({ name, pct }, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < muscles.length - 1 ? 12 : 0 }}>
              <span style={{ width: 80, fontSize: 14, fontWeight: 500, color: '#111', flexShrink: 0 }}>{name}</span>
              <div style={{ flex: 1, height: 6, background: '#F1EFE8', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#3B6D11', borderRadius: 3, width: `${pct}%`, transition: 'width 0.7s' }} />
              </div>
              <span style={{ width: 32, fontSize: 12, color: '#999', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
            </div>
          ))}
        </div>

        {/* ── 6. AI COACH NOTE ───────────────────────────────── */}
        <div style={{ marginTop: 20, background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', padding: 16, display: 'flex', gap: 12 }}>
          <div style={{ width: 2, background: '#0F6E56', borderRadius: 1, alignSelf: 'stretch', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 8 }}>AI COACH</p>
            <p style={{ fontSize: 14, color: '#111', lineHeight: 1.6 }}>{coachNote}</p>
            <p style={{ fontSize: 11, color: '#CCC', marginTop: 8 }}>Powered by FitForge AI</p>
          </div>
        </div>
      </div>

      {/* ── 7. FIXED BOTTOM BAR ─────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid rgba(0,0,0,0.05)',
        padding: '16px 20px 32px',
      }}>
        <button
          onClick={() => navigate('/workout', { replace: true })}
          style={{ width: '100%', height: 52, background: '#111', color: 'white', fontSize: 16, fontWeight: 500, borderRadius: 12, border: 'none', cursor: 'pointer' }}
        >
          Back to Workouts
        </button>
        <button
          onClick={() => {/* future share */}}
          style={{ width: '100%', height: 52, background: 'white', color: '#111', fontSize: 14, fontWeight: 500, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', marginTop: 8 }}
        >
          Share Workout
        </button>
      </div>
    </div>
  )
}
