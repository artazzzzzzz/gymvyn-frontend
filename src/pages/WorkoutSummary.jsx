import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import PrimaryButton from '../components/PrimaryButton'

const BASE = import.meta.env.VITE_API_URL || ''

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
        break
      }
    }
  }
  return prs
}

// Map a workout_logs DB row (exercises JSONB) to the display-friendly shape
function dbRowToSummary(row) {
  return {
    workoutId:      row.id,
    startedAt:      row.started_at,
    durationMinutes: row.duration_minutes || 0,
    planName:       row.plan_name || '',
    exercises: (row.exercises || []).map(ex => ({
      exerciseId:   ex.name,
      exerciseName: ex.name,
      muscleGroup:  ex.muscle_group || '',
      sets: (ex.sets || []).map(s => ({
        setNumber: s.set_number,
        weight:    s.weight_kg   || 0,
        reps:      s.reps_completed || 0,
      })),
    })),
  }
}

export default function WorkoutSummary() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { workoutId } = useParams()
  const { user }  = useAuth()

  const [summary,    setSummary]    = useState(location.state?.summary || null)
  const [fetching,   setFetching]   = useState(!location.state?.summary && !!workoutId)
  const [fetchError, setFetchError] = useState(null)

  const [prs,       setPrs]       = useState({})
  const [prLoading, setPrLoading] = useState(true)
  const [expandedExercise, setExpandedExercise] = useState(null)

  // Fallback fetch when arriving by hard refresh (no location.state)
  useEffect(() => {
    if (summary || !workoutId) return
    setFetching(true)
    fetch(`${BASE}/api/workout/logs/${workoutId}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
      .then(data => setSummary(dbRowToSummary(data)))
      .catch(err => setFetchError(err.message))
      .finally(() => setFetching(false))
  }, [workoutId]) // eslint-disable-line react-hooks/exhaustive-deps

  const exercises   = summary?.exercises || []
  const durationSec = (summary?.durationMinutes ?? 0) * 60
  const startedAt   = summary?.startedAt   || null
  const planName    = summary?.planName    || ''

  // Set default expanded exercise
  useEffect(() => {
    if (exercises.length) setExpandedExercise(exercises[0].exerciseId)
  }, [exercises.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // PR check against previous sessions
  useEffect(() => {
    if (!user || !exercises?.length || !startedAt) {
      setPrLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const result = {}
      try {
        const exerciseIds = exercises.map(e => e.exerciseId).filter(id => id && id.includes('-'))
        if (!exerciseIds.length) { setPrs({}); setPrLoading(false); return }
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
          const sessionMax = ex.sets.reduce((m, s) => Math.max(m, s.weight || 0), 0)
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
  }, [user, summary]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / error states ────────────────────────────────────────────────
  if (fetching) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--text-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (fetchError || (!summary && !fetching)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: "var(--text-primary)", fontWeight: 500 }}>Workout summary not found</p>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{fetchError || 'This summary may have expired or been removed.'}</p>
        <PrimaryButton
          onClick={() => navigate('/workout', { replace: true })}
          style={{ width: 'auto', height: 48, padding: '0 24px', fontSize: 14, fontWeight: 500, borderRadius: 12, boxShadow: 'none' }}
        >
          Back to Workouts
        </PrimaryButton>
      </div>
    )
  }

  // ── Computed values ───────────────────────────────────────────────────────
  const totalSets    = exercises.reduce((s, ex) => s + ex.sets.length, 0)
  const totalVolume  = computeVolume(exercises)
  const muscles      = computeMuscles(exercises)
  const localPRs     = computePRsFromSets(exercises)
  const formattedVol = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}k`
    : `${Math.round(totalVolume)}`

  const coachNote = (() => {
    const vol = totalVolume > 4000 ? 'Strong session.' : 'Solid session.'
    const pr  = localPRs.length > 0 ? ` Hit ${localPRs.length} new PR${localPRs.length > 1 ? 's' : ''} today.` : ''
    return vol + pr + ' Keep progressive overload consistent — aim to add 2.5 kg or 1 rep on your primary lift next session.'
  })()

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)', paddingBottom: 144 }}>

      {/* ── 1. TOP BAR ─────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)" }}>Workout Complete</span>
        <span style={{ position: 'absolute', right: 20, fontSize: 12, fontWeight: 500, color: 'var(--success)' }}>
          Saved ✓
        </span>
      </div>

      {/* ── 2. HERO STATS CARD ─────────────────────────────── */}
      <div style={{ paddingTop: 72, paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: "var(--text-primary)" }}>{planName || 'Workout'}</p>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{formatDateLabel(startedAt)}</p>
          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid var(--border)' }}>
            {[
              { value: formatDurationSec(durationSec), label: 'TIME' },
              { value: exercises.length,               label: 'EXER.' },
              { value: totalSets,                      label: 'SETS' },
              { value: `${formattedVol}kg`,            label: 'VOL' },
            ].map(({ value, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', borderRight: '1px solid var(--border)' }}>
                <span style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginTop: 2 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ── 3. PR SECTION ──────────────────────────────────── */}
        {localPRs.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginBottom: 12 }}>PERSONAL RECORDS</p>
            {localPRs.map((pr, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>🏆</span>
                </div>
                <div>
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 20 }}>NEW PR</span>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", marginTop: 4 }}>{pr.exerciseName}</p>
                  <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{pr.kg} kg × {pr.reps} reps</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>Previous best: {pr.previousKg} kg × {pr.previousReps}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 4. EXERCISE BREAKDOWN ──────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginBottom: 12 }}>EXERCISES</p>
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", textAlign: 'center', padding: '16px 0' }}>No exercises logged</p>
          ) : exercises.map(ex => {
            const isExpanded = expandedExercise === ex.exerciseId
            const exVol      = ex.sets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0)
            const bestSet    = getBestSet(ex.sets)

            return (
              <div key={ex.exerciseId} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 8, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedExercise(isExpanded ? null : ex.exerciseId)}
                  style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{ex.exerciseName}</span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{ex.sets.length} sets · {exVol} kg</span>
                  <span style={{ fontSize: 16, color: "var(--text-tertiary)", transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 8 }}>
                      {['SET', 'KG', 'REPS', 'VOL'].map(h => (
                        <span key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: "var(--text-tertiary)" }}>{h}</span>
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
                            borderLeft: isBest ? '2px solid var(--success)' : '2px solid transparent',
                            paddingLeft: isBest ? 8 : 0,
                            background: isBest ? 'rgba(59,109,17,0.03)' : 'transparent',
                            borderRadius: isBest ? '0 6px 6px 0' : 0,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{set.setNumber}</span>
                          <span style={{ fontWeight: 500, color: "var(--text-primary)", display: 'flex', alignItems: 'center', gap: 4 }}>
                            {set.weight}
                            {isPR && (
                              <span style={{ fontSize: 9, fontWeight: 500, background: 'var(--success-bg)', color: 'var(--success)', padding: '1px 5px', borderRadius: 20 }}>PR</span>
                            )}
                          </span>
                          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{set.reps}</span>
                          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{(set.weight || 0) * (set.reps || 0)} kg</span>
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
        {muscles.length > 0 && (
          <div style={{ marginTop: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginBottom: 16 }}>MUSCLES WORKED</p>
            {muscles.map(({ name, pct }, i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < muscles.length - 1 ? 12 : 0 }}>
                <span style={{ width: 80, fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flexShrink: 0 }}>{name}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-pill)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--success)', borderRadius: 3, width: `${pct}%`, transition: 'width 0.7s' }} />
                </div>
                <span style={{ width: 32, fontSize: 12, color: "var(--text-tertiary)", textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* ── 6. AI COACH NOTE ───────────────────────────────── */}
        <div style={{ marginTop: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', gap: 12 }}>
          <div style={{ width: 2, background: 'var(--success)', borderRadius: 1, alignSelf: 'stretch', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: "var(--text-tertiary)", marginBottom: 8 }}>AI COACH</p>
            <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{coachNote}</p>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>Powered by Gymvyn</p>
          </div>
        </div>
      </div>

      {/* ── 7. FIXED BOTTOM BAR ─────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
        padding: '16px 20px 32px',
      }}>
        <PrimaryButton
          onClick={() => navigate('/workout', { replace: true })}
          style={{ borderRadius: 12, background: 'var(--cta-bg)', border: '1px solid var(--cta-border)', color: 'var(--cta-text)' }}
        >
          Back to Workouts
        </PrimaryButton>
        <button
          onClick={() => {/* future share */}}
          style={{ width: '100%', height: 52, background: 'transparent', color: "var(--text-primary)", fontSize: 14, fontWeight: 500, borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', marginTop: 8 }}
        >
          Share Workout
        </button>
      </div>
    </div>
  )
}
