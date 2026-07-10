import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Trash2, Check, Pencil, X, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { updateWorkoutSet, deleteWorkoutSet, deleteWorkout } from '../utils/api'
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

function dbRowToSummary(row) {
  return {
    workoutId:       row.id,
    startedAt:       row.started_at,
    durationMinutes: row.duration_minutes || 0,
    planName:        row.plan_name || '',
    exercises: (row.exercises || []).map(ex => ({
      exerciseId:   ex.name,
      exerciseName: ex.name,
      muscleGroup:  ex.muscle_group || '',
      sets: (ex.sets || []).map(s => ({
        setNumber: s.set_number,
        weight:    s.weight_kg       || 0,
        reps:      s.reps_completed  || 0,
      })),
    })),
  }
}

// ─── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteWorkoutModal({ onConfirm, onCancel, deleting }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{
        position: 'relative', background: 'var(--bg-card)', borderRadius: 16,
        border: '1px solid var(--border)', padding: '24px 20px', width: '100%', maxWidth: 340,
      }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          Delete Workout?
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
          This can't be undone. All sets will be permanently removed.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: 'var(--error)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function WorkoutSummary() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { workoutId } = useParams()
  const { user }  = useAuth()

  const [summary,    setSummary]    = useState(location.state?.summary || null)
  const [fetching,   setFetching]   = useState(!location.state?.summary && !!workoutId)
  const [fetchError, setFetchError] = useState(null)
  const [expandedExercise, setExpandedExercise] = useState(null)

  // workout_set_logs — provides real row IDs for editing
  const [setLogs,    setSetLogs]    = useState([]) // raw rows from DB

  // Inline edit state
  const [editingId,  setEditingId]  = useState(null) // set log id being edited
  const [editWeight, setEditWeight] = useState('')
  const [editReps,   setEditReps]   = useState('')
  const [saving,     setSaving]     = useState(false)

  // Workout delete
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting,        setDeleting]        = useState(false)

  const [prs,       setPrs]       = useState({})
  const [prLoading, setPrLoading] = useState(true)

  // Resolved workoutId — could come from params or from summary state
  const resolvedWorkoutId = workoutId || summary?.workoutId

  // ── Fetch workout log if not in location.state ─────────────────────────────
  useEffect(() => {
    if (summary || !workoutId) return
    setFetching(true)
    supabase.auth.getSession().then(({ data: { session } }) =>
      fetch(`${BASE}/api/workout/logs/${workoutId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
        .then(data => setSummary(dbRowToSummary(data)))
        .catch(err => setFetchError(err.message))
        .finally(() => setFetching(false))
    )
  }, [workoutId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch workout_set_logs to get real IDs for editing ─────────────────────
  async function fetchSetLogs(wId) {
    if (!wId) return
    const { data } = await supabase
      .from('workout_set_logs')
      .select('id, exercise_id, exercise_name, set_number, weight_kg, reps_completed')
      .eq('workout_log_id', wId)
      .order('exercise_name', { ascending: true })
      .order('set_number', { ascending: true })
    setSetLogs(data ?? [])
  }

  useEffect(() => {
    if (resolvedWorkoutId) fetchSetLogs(resolvedWorkoutId)
  }, [resolvedWorkoutId]) // eslint-disable-line react-hooks/exhaustive-deps

  const exercises = summary?.exercises || []
  const durationSec = (summary?.durationMinutes ?? 0) * 60
  const startedAt   = summary?.startedAt   || null
  const planName    = summary?.planName    || ''

  // Set default expanded exercise
  useEffect(() => {
    if (exercises.length) setExpandedExercise(exercises[0].exerciseId)
  }, [exercises.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // PR check against previous sessions
  useEffect(() => {
    if (!user || !exercises?.length || !startedAt) { setPrLoading(false); return }
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
          if (sessionMax > 0 && sessionMax > before)
            result[ex.exerciseId] = { weight: sessionMax, previous: before }
        }
      } catch (err) {
        console.error('[WorkoutSummary] PR check error:', err)
      }
      if (!cancelled) { setPrs(result); setPrLoading(false) }
    })()
    return () => { cancelled = true }
  }, [user, summary]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Set editing ────────────────────────────────────────────────────────────
  function startEdit(setLogRow) {
    setEditingId(setLogRow.id)
    setEditWeight(String(setLogRow.weight_kg ?? ''))
    setEditReps(String(setLogRow.reps_completed ?? ''))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditWeight('')
    setEditReps('')
  }

  async function confirmEdit() {
    if (!user || !editingId) return
    setSaving(true)
    try {
      await updateWorkoutSet(editingId, user.id, parseFloat(editWeight) || 0, parseInt(editReps, 10) || 0)
      await fetchSetLogs(resolvedWorkoutId)
      cancelEdit()
    } catch (err) {
      console.error('Edit set error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSet(setId) {
    if (!user) return
    try {
      await deleteWorkoutSet(setId, user.id)
      await fetchSetLogs(resolvedWorkoutId)
    } catch (err) {
      console.error('Delete set error:', err)
    }
  }

  async function handleDeleteWorkout() {
    if (!user || !resolvedWorkoutId) return
    setDeleting(true)
    try {
      await deleteWorkout(resolvedWorkoutId, user.id)
      navigate('/workout', { replace: true })
    } catch (err) {
      console.error('Delete workout error:', err)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Build a lookup: exerciseName → setNumber → setLog row
  const setLogMap = {}
  for (const sl of setLogs) {
    const key = sl.exercise_name || sl.exercise_id
    if (!setLogMap[key]) setLogMap[key] = {}
    setLogMap[key][sl.set_number] = sl
  }
  const hasSetLogs = setLogs.length > 0

  // ── Loading / error ────────────────────────────────────────────────────────
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
        <p style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 500 }}>Workout summary not found</p>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{fetchError || 'This summary may have expired or been removed.'}</p>
        <PrimaryButton onClick={() => navigate('/workout', { replace: true })} style={{ width: 'auto', height: 48, padding: '0 24px', fontSize: 14, fontWeight: 500, borderRadius: 12, boxShadow: 'none' }}>
          Back to Workouts
        </PrimaryButton>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalSets   = hasSetLogs ? setLogs.length : exercises.reduce((s, ex) => s + ex.sets.length, 0)
  const totalVolume = computeVolume(exercises)
  const muscles     = computeMuscles(exercises)
  const localPRs    = computePRsFromSets(exercises)
  const formattedVol = totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : `${Math.round(totalVolume)}`

  const coachNote = (() => {
    const vol = totalVolume > 4000 ? 'Strong session.' : 'Solid session.'
    const pr  = localPRs.length > 0 ? ` Hit ${localPRs.length} new PR${localPRs.length > 1 ? 's' : ''} today.` : ''
    return vol + pr + ' Keep progressive overload consistent — aim to add 2.5 kg or 1 rep on your primary lift next session.'
  })()

  // Determine if arriving from post-workout or from history
  const fromPostWorkout = !!location.state?.summary

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)', paddingBottom: 160 }}>

      {/* ── TOP BAR ─────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!fromPostWorkout && (
          <button
            onClick={() => navigate(-1)}
            style={{ position: 'absolute', left: 16, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', padding: 4 }}
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
          {fromPostWorkout ? 'Workout Complete' : 'Workout Detail'}
        </span>
        {fromPostWorkout && (
          <span style={{ position: 'absolute', right: 20, fontSize: 12, fontWeight: 500, color: 'var(--success)' }}>
            Saved
          </span>
        )}
      </div>

      {/* ── HERO STATS CARD ─────────────────────────────── */}
      <div style={{ paddingTop: 72, paddingLeft: 20, paddingRight: 20 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)' }}>{planName || 'Workout'}</p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{formatDateLabel(startedAt)}</p>
          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderLeft: '1px solid var(--border)' }}>
            {[
              { value: formatDurationSec(durationSec), label: 'TIME' },
              { value: exercises.length,               label: 'EXER.' },
              { value: totalSets,                      label: 'SETS' },
              { value: `${formattedVol}kg`,            label: 'VOL' },
            ].map(({ value, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', borderRight: '1px solid var(--border)' }}>
                <span style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginTop: 2 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* ── PR SECTION ──────────────────────────────────── */}
        {localPRs.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>PERSONAL RECORDS</p>
            {localPRs.map((pr, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
                  </svg>
                </div>
                <div>
                  <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 20 }}>NEW PR</span>
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>{pr.exerciseName}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>{pr.kg} kg × {pr.reps} reps</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Previous best: {pr.previousKg} kg × {pr.previousReps}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EXERCISE BREAKDOWN ──────────────────────────── */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>EXERCISES</p>
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>No exercises logged</p>
          ) : exercises.map(ex => {
            const isExpanded = expandedExercise === ex.exerciseId
            // Prefer live set_logs data over stale JSONB snapshot when available
            const liveSets = setLogMap[ex.exerciseName]
            const displaySets = ex.sets.map(s => {
              const live = liveSets?.[s.setNumber]
              return live
                ? { ...s, weight: Number(live.weight_kg), reps: Number(live.reps_completed), _setLogId: live.id }
                : { ...s, _setLogId: null }
            }).filter(s => {
              // Hide sets that have been deleted from set_logs (only when set_logs exist)
              if (!hasSetLogs) return true
              return liveSets?.[s.setNumber] !== undefined
            })
            if (hasSetLogs && displaySets.length === 0) return null
            const exVol   = displaySets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0)
            const bestSet = displaySets.length > 0 ? getBestSet(displaySets) : null

            return (
              <div key={ex.exerciseId} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 8, overflow: 'hidden' }}>
                {/* Exercise header */}
                <div
                  onClick={() => setExpandedExercise(isExpanded ? null : ex.exerciseId)}
                  style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{ex.exerciseName}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{displaySets.length} sets · {exVol} kg</span>
                  <span style={{ fontSize: 16, color: 'var(--text-tertiary)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px 16px' }}>
                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr auto', gap: 4, marginBottom: 8, alignItems: 'center' }}>
                      {['SET', 'KG', 'REPS', 'VOL', ''].map(h => (
                        <span key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>{h}</span>
                      ))}
                    </div>

                    {displaySets.map(set => {
                      const isBest    = bestSet && set === bestSet
                      const setLogId  = set._setLogId
                      const isEditing = editingId === setLogId
                      const setLogRow = setLogId ? setLogs.find(sl => sl.id === setLogId) : null

                      if (isEditing) {
                        return (
                          <div key={set.setNumber} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 28, flexShrink: 0 }}>{set.setNumber}</span>
                            <input
                              type="number"
                              value={editWeight}
                              onChange={e => setEditWeight(e.target.value)}
                              inputMode="decimal"
                              step="0.5"
                              min="0"
                              style={{
                                flex: 1, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                                fontSize: 14, fontWeight: 500, textAlign: 'center', outline: 'none',
                                padding: '0 4px',
                              }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>×</span>
                            <input
                              type="number"
                              value={editReps}
                              onChange={e => setEditReps(e.target.value)}
                              inputMode="numeric"
                              min="0"
                              style={{
                                flex: 1, height: 34, borderRadius: 8, border: '1px solid var(--border)',
                                background: 'var(--bg-elevated)', color: 'var(--text-primary)',
                                fontSize: 14, fontWeight: 500, textAlign: 'center', outline: 'none',
                                padding: '0 4px',
                              }}
                            />
                            <button
                              onClick={confirmEdit}
                              disabled={saving}
                              style={{ background: 'none', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', padding: 4, color: 'var(--success)', flexShrink: 0 }}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)', flexShrink: 0 }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={set.setNumber}
                          style={{
                            display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr auto',
                            gap: 4, padding: '10px 0', fontSize: 13, alignItems: 'center',
                            borderLeft: isBest ? '2px solid var(--success)' : '2px solid transparent',
                            paddingLeft: isBest ? 8 : 0,
                            background: isBest ? 'rgba(59,109,17,0.03)' : 'transparent',
                            borderRadius: isBest ? '0 6px 6px 0' : 0,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{set.setNumber}</span>
                          <button
                            onClick={() => setLogRow && startEdit(setLogRow)}
                            disabled={!setLogId}
                            style={{ fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: setLogId ? 'pointer' : 'default', padding: 0, fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {set.weight}
                            {setLogId && <Pencil size={10} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />}
                          </button>
                          <button
                            onClick={() => setLogRow && startEdit(setLogRow)}
                            disabled={!setLogId}
                            style={{ fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: setLogId ? 'pointer' : 'default', padding: 0, fontSize: 13, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {set.reps}
                            {setLogId && <Pencil size={10} color="var(--text-tertiary)" style={{ opacity: 0.5 }} />}
                          </button>
                          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            {(set.weight || 0) * (set.reps || 0)} kg
                          </span>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {setLogId && (
                              <button
                                onClick={() => handleDeleteSet(setLogId)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }).filter(Boolean)}
        </div>

        {/* ── MUSCLE HEATMAP ──────────────────────────────── */}
        {muscles.length > 0 && (
          <div style={{ marginTop: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 16 }}>MUSCLES WORKED</p>
            {muscles.map(({ name, pct }, i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < muscles.length - 1 ? 12 : 0 }}>
                <span style={{ width: 80, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flexShrink: 0 }}>{name}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg-pill)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--success)', borderRadius: 3, width: `${pct}%`, transition: 'width 0.7s' }} />
                </div>
                <span style={{ width: 32, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* ── AI COACH NOTE ───────────────────────────────── */}
        <div style={{ marginTop: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', gap: 12 }}>
          <div style={{ width: 2, background: 'var(--success)', borderRadius: 1, alignSelf: 'stretch', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 8 }}>AI COACH</p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{coachNote}</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>Powered by Gymvyn</p>
          </div>
        </div>

      </div>

      {/* ── FIXED BOTTOM BAR ─────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
        padding: '16px 20px 32px',
      }}>
        <PrimaryButton
          onClick={() => navigate('/workout', { replace: true })}
          style={{ borderRadius: 12, background: 'var(--cta-bg)', border: '1px solid var(--cta-border)', color: 'var(--cta-text)' }}
        >
          {fromPostWorkout ? 'Back to Workouts' : 'Back'}
        </PrimaryButton>

        {/* Delete Workout — only show when we have a real workoutId */}
        {resolvedWorkoutId && (
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              width: '100%', height: 50, marginTop: 10, borderRadius: 12,
              background: 'transparent', border: '1px solid var(--error)',
              color: 'var(--error)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Trash2 size={16} />
            Delete Workout
          </button>
        )}
      </div>

      {/* ── DELETE WORKOUT MODAL ──────────────────────────── */}
      {showDeleteModal && (
        <DeleteWorkoutModal
          onConfirm={handleDeleteWorkout}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
