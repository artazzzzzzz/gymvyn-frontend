import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  X, Check, Plus, Trash2, Camera, ChevronLeft, Loader2, AlertCircle,
  SkipForward, Info, Mic,
} from 'lucide-react'
import { useWorkoutSessionContext } from '../contexts/WorkoutSessionContext'
import ExercisePicker from '../components/ExercisePicker'
import ExerciseDetailSheet from '../components/ExerciseDetailSheet'
import PrimaryButton from '../components/PrimaryButton'
import { supabase } from '../utils/supabase'
import { useAuth } from '../hooks/useAuth'
import FormCoachModal from '../components/FormCoachModal'
import { hasFormDetection } from '../utils/formRuleMapping'
import { useXPToast } from '../components/XPToast'
import VoiceWorkoutRecorder from '../components/VoiceWorkoutRecorder'

const MUSCLE_COLOURS = {
  chest:     'bg-red-500/15 text-red-300 ring-red-500/30',
  back:      'bg-[var(--text-cta)]/15 text-blue-300 ring-blue-500/30',
  legs:      'bg-green-500/15 text-green-300 ring-green-500/30',
  shoulders: 'bg-purple-500/15 text-purple-300 ring-purple-500/30',
  arms:      'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  biceps:    'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  triceps:   'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  core:      'bg-yellow-500/15 text-yellow-300 ring-yellow-500/30',
  cardio:    'bg-teal-500/15 text-teal-300 ring-teal-500/30',
}
function muscleClass(group) {
  return MUSCLE_COLOURS[(group ?? '').toLowerCase()] ?? 'bg-gray-500/15 text-[var(--text-disabled)] ring-gray-500/30'
}

function formatElapsed(s) {
  const h = Math.floor(s / 3600).toString().padStart(2, '0')
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${h}:${m}:${sec}`
}

function formatMmSs(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const REST_PRESETS = [
  { label: '30s',  value: 30 },
  { label: '60s',  value: 60 },
  { label: '90s',  value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
]

// ─── Rest Timer Bar ──────────────────────────────────────────────────────────

function RestTimerBar({ restTimer, restDuration, onSkip, onChangeDuration }) {
  const { active, secondsLeft, totalSeconds } = restTimer
  const pct = totalSeconds ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0

  return (
    <div className={[
      'fixed top-0 inset-x-0 z-40 bg-gray-900 border-b border-white/[0.08] transition-transform duration-200 pt-safe',
      active ? 'translate-y-0' : '-translate-y-full',
    ].join(' ')}>
      <div className="max-w-lg mx-auto px-5 pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 ring-1 ring-inset ring-orange-500/30 flex items-center justify-center">
              <SkipForward size={14} className="text-orange-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Rest</p>
              <p className="text-white font-mono font-bold text-base leading-tight">{formatMmSs(secondsLeft)}</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-xs text-[var(--text-disabled)] hover:text-white font-semibold px-3 py-1.5 rounded-lg bg-[var(--bg-card)]/[0.05] hover:bg-[var(--bg-card)]/[0.1] transition-colors"
          >
            Skip
          </button>
        </div>
        <div className="h-1 rounded-full bg-[var(--bg-card)]/[0.06] overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-hide">
          {REST_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => onChangeDuration(p.value)}
              className={[
                'shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors',
                restDuration === p.value
                  ? 'bg-orange-500/20 text-orange-200 ring-orange-500/40'
                  : 'bg-[var(--bg-card)]/[0.03] text-[var(--text-tertiary)] ring-white/10 hover:text-white',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Set Row ─────────────────────────────────────────────────────────────────

function SetRow({ set, previous, onUpdate, onComplete, onRemove }) {
  const prev = previous
    ? `${previous.weight_kg ?? 0}kg × ${previous.reps_completed ?? 0}`
    : '—'

  return (
    <div className={[
      'grid grid-cols-[28px_1fr_72px_64px_40px] items-center gap-2 px-2 py-2 rounded-lg transition-colors',
      set.completed ? 'bg-emerald-500/10' : 'hover:bg-[var(--bg-card)]/[0.02]',
    ].join(' ')}>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold ${set.completed ? 'text-emerald-300' : 'text-[var(--text-disabled)]'}`}>
          {set.setNumber}
        </span>
      </div>
      <span className="text-xs text-[var(--text-tertiary)] truncate">{prev}</span>
      <input
        type="number"
        inputMode="decimal"
        value={set.weight}
        onChange={e => onUpdate('weight', e.target.value)}
        disabled={set.completed}
        placeholder="0"
        className="w-full bg-gray-800/60 border border-white/[0.06] rounded-md px-2 py-1.5 text-sm text-white text-center placeholder-gray-600 focus:outline-none focus:border-orange-500/40 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <input
        type="number"
        inputMode="numeric"
        value={set.reps}
        onChange={e => onUpdate('reps', e.target.value)}
        disabled={set.completed}
        placeholder="0"
        className="w-full bg-gray-800/60 border border-white/[0.06] rounded-md px-2 py-1.5 text-sm text-white text-center placeholder-gray-600 focus:outline-none focus:border-orange-500/40 disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {set.completed ? (
        <button
          onClick={onRemove}
          className="w-9 h-9 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-300 hover:text-red-300 hover:bg-red-500/15 transition-colors"
          title="Remove set"
        >
          <Check size={16} strokeWidth={3} />
        </button>
      ) : (
        <button
          onClick={onComplete}
          className="w-9 h-9 rounded-md bg-[var(--bg-card)]/[0.04] flex items-center justify-center text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-card)]/[0.1] transition-colors"
          title="Complete set"
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

// ─── Exercise Block ──────────────────────────────────────────────────────────

function ExerciseBlock({ exercise, userId, onAddSet, onRemoveSet, onUpdateSet, onCompleteSet, onRemove, onCheckForm }) {
  const [previousMap, setPreviousMap] = useState({})

  useEffect(() => {
    if (!userId || !exercise.exerciseId) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('workout_set_logs')
        .select('set_number, reps_completed, weight_kg, workout_log:workout_logs!inner(user_id, completed_at)')
        .eq('exercise_id', exercise.exerciseId)
        .eq('workout_log.user_id', userId)
        .not('workout_log.completed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled || !data) return
      const map = {}
      for (const row of data) {
        if (map[row.set_number]) continue
        map[row.set_number] = row
      }
      setPreviousMap(map)
    })()
    return () => { cancelled = true }
  }, [userId, exercise.exerciseId])

  const aiForm = hasFormDetection(exercise.exerciseName)

  return (
    <div className="bg-gray-900 border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-white font-semibold text-base truncate">{exercise.exerciseName}</h3>
          {exercise.muscleGroup && (
            <span className={`mt-1 inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ring-inset ${muscleClass(exercise.muscleGroup)}`}>
              {exercise.muscleGroup}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onCheckForm(exercise)}
            className={[
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              aiForm
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-[var(--text-cta)]/15 text-blue-300 ring-1 ring-inset ring-blue-500/30 hover:bg-[var(--text-cta)]/25',
            ].join(' ')}
            title={aiForm ? 'AI Form Check' : 'Guided Form Check'}
          >
            <Camera size={15} />
          </button>
          <button
            onClick={onRemove}
            className="w-9 h-9 rounded-xl bg-[var(--bg-card)]/[0.03] text-[var(--text-tertiary)] hover:text-red-300 hover:bg-red-500/15 flex items-center justify-center transition-colors"
            title="Remove exercise"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[28px_1fr_72px_64px_40px] gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
        <span>Set</span>
        <span>Previous</span>
        <span className="text-center">Kg</span>
        <span className="text-center">Reps</span>
        <span />
      </div>

      <div className="space-y-1">
        {exercise.sets.map(s => (
          <SetRow
            key={s.setNumber}
            set={s}
            previous={previousMap[s.setNumber]}
            onUpdate={(field, value) => onUpdateSet(exercise.exerciseId, s.setNumber, field, value)}
            onComplete={() => onCompleteSet(exercise.exerciseId, s.setNumber)}
            onRemove={() => onRemoveSet(exercise.exerciseId, s.setNumber)}
          />
        ))}
      </div>

      <button
        onClick={() => onAddSet(exercise.exerciseId)}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--text-tertiary)] hover:text-white py-2 rounded-lg bg-[var(--bg-card)]/[0.03] hover:bg-[var(--bg-card)]/[0.06] transition-colors"
      >
        <Plus size={13} />
        Add Set
      </button>
    </div>
  )
}


// ─── Set Row ─────────────────────────────────────────────────────────────────

function SwipeableSetRow({ set, prevData, prevText, onUpdate, onComplete, onRemove }) {
  const shadowWeight = prevData?.weight_kg     ?? null
  const shadowReps   = prevData?.reps_completed ?? null

  const completedBg = 'var(--accent-bg)'
  const completedFg = 'var(--text-cta)'
  const rowBg       = set.completed ? completedBg : 'var(--bg-card)'
  const rowBorder   = set.completed ? `2px solid ${completedFg}` : '2px solid transparent'

  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 68px 64px 44px 44px',
        gap: 6, padding: '6px 4px', alignItems: 'center', borderRadius: 8,
        background: rowBg,
        borderLeft: rowBorder,
      }}
    >
      {/* Set number */}
      <span style={{ fontSize: 13, fontWeight: 500, color: set.completed ? completedFg : 'var(--text-tertiary)' }}>
        {set.setNumber}
      </span>

      {/* Previous column */}
      <span style={{ fontSize: 12, color: 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {prevText ?? '—'}
      </span>

      {/* KG */}
      {set.completed ? (
        <span style={{ fontSize: 13, color: completedFg, textAlign: 'center', fontWeight: 500 }}>{set.weight || '—'}</span>
      ) : (
        <input
          type="number" inputMode="decimal"
          value={set.weight}
          onChange={e => onUpdate('weight', e.target.value)}
          placeholder={shadowWeight != null ? String(shadowWeight) : ''}
          className="ls-set-input"
          style={{ width: '100%', height: 36, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center', fontSize: 14, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
        />
      )}

      {/* Reps */}
      {set.completed ? (
        <span style={{ fontSize: 13, color: completedFg, textAlign: 'center', fontWeight: 500 }}>{set.reps || '—'}</span>
      ) : (
        <input
          type="number" inputMode="numeric"
          value={set.reps}
          onChange={e => onUpdate('reps', e.target.value)}
          placeholder={shadowReps != null ? String(shadowReps) : ''}
          className="ls-set-input"
          style={{ width: '100%', height: 36, background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center', fontSize: 14, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
        />
      )}

      {/* Complete / undo button — 44×44 tap target */}
      {set.completed ? (
        <button
          onClick={onRemove}
          style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--accent-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Undo set"
        >
          <Check size={15} color={completedFg} strokeWidth={3} />
        </button>
      ) : (
        <button
          onClick={() => onComplete(shadowWeight, shadowReps)}
          style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-pill)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Log set"
        >
          <Check size={15} color="var(--text-tertiary)" strokeWidth={2.5} />
        </button>
      )}

      {/* Delete button — 44×44 tap target, dimmed when set is completed */}
      <button
        onClick={onRemove}
        style={{
          width: 44, height: 44, borderRadius: 8, background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--error)',
          opacity: set.completed ? 0.4 : 1,
        }}
        title="Remove set"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

// ─── Cancel Confirm ──────────────────────────────────────────────────────────

function ConfirmDialog({ open, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: '20px 20px 0 0',
          padding: '32px 24px 40px',
          width: '100%',
          maxWidth: '480px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--error)" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 8px' }}>
          End this workout?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center', margin: '0 0 28px', lineHeight: 1.5 }}>
          Your progress won't be saved.
        </p>
        <button
          onClick={onConfirm}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--error)', color: "var(--bg-card)", fontWeight: 600, fontSize: 15, border: 'none', marginBottom: 12, cursor: 'pointer' }}
        >
          Discard Workout
        </button>
        <button
          onClick={onCancel}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--border)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, border: 'none', cursor: 'pointer' }}
        >
          Keep Going
        </button>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LiveSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const preloaded = location.state
  const { user } = useAuth()

  const session = useWorkoutSessionContext()
  const {
    sessionId, exercises, isActive, elapsedSeconds, restTimer, restDuration,
    isSaving, error,
    startSession, addExercise, removeExercise, addSet, removeSet, updateSet,
    completeSet, updateSetFormScore, finishSession, cancelSession, skipRest, setRestDuration,
    clearError,
  } = session

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerInitialSearch, setPickerInitialSearch] = useState('')
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [formCoachOpen, setFormCoachOpen] = useState(false)
  const [formCoachExercise, setFormCoachExercise] = useState('')
  const [formCoachTargetExerciseId, setFormCoachTargetExerciseId] = useState(null)
  const [bootError, setBootError] = useState(null)
  const [detailSheetName, setDetailSheetName] = useState(null)

  // ── Previous performance (per exercise, fetched once per session) ────────────
  const [previousPerf, setPreviousPerf] = useState({})
  const fetchedNamesRef = useRef(new Set())

  useEffect(() => {
    if (!user || !exercises.length) return
    const newNames = exercises
      .map(ex => ex.exerciseName)
      .filter(name => !fetchedNamesRef.current.has(name))
    if (!newNames.length) return
    newNames.forEach(n => fetchedNamesRef.current.add(n))

    ;(async () => {
      const { data, error } = await supabase
        .from('workout_set_logs')
        .select('exercise_name, set_number, reps_completed, weight_kg, workout_log_id, workout_log:workout_logs!inner(user_id, started_at)')
        .in('exercise_name', newNames)
        .eq('workout_log.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(newNames.length * 20)

      if (error || !data) return

      // For each exercise, pick the most recent workout_log_id then build set map
      const latestLog = {}  // exerciseName -> { logId, startedAt }
      const setsByLog = {}  // `${exerciseName}:${logId}` -> { setNumber -> row }

      for (const row of data) {
        const exName = row.exercise_name
        const logId  = row.workout_log_id
        const startedAt = row.workout_log?.started_at ?? ''

        if (!latestLog[exName] || startedAt > latestLog[exName].startedAt) {
          latestLog[exName] = { logId, startedAt }
        }

        const key = `${exName}:${logId}`
        if (!setsByLog[key]) setsByLog[key] = {}
        if (!setsByLog[key][row.set_number]) {
          setsByLog[key][row.set_number] = { weight_kg: row.weight_kg, reps_completed: row.reps_completed }
        }
      }

      const result = {}
      for (const [exName, { logId }] of Object.entries(latestLog)) {
        result[exName] = setsByLog[`${exName}:${logId}`] ?? {}
      }

      setPreviousPerf(prev => ({ ...prev, ...result }))
    })()
  }, [exercises, user])

  function handleCheckForm(exercise) {
    setFormCoachExercise(exercise.exerciseName)
    setFormCoachTargetExerciseId(exercise.exerciseId)
    setFormCoachOpen(true)
  }

  function handleFormScore(score) {
    if (!formCoachTargetExerciseId) return
    const target = exercises.find(e => e.exerciseId === formCoachTargetExerciseId)
    if (!target) return
    const lastCompleted = [...target.sets].reverse().find(s => s.completed)
    if (!lastCompleted) {
      return
    }
    updateSetFormScore(formCoachTargetExerciseId, lastCompleted.setNumber, score)
  }

  // Pre-load exercises from ?exercises= or location.state plan, then start the session
  useEffect(() => {
    if (!user || isActive) return
    let cancelled = false
    ;(async () => {
      const id = await startSession()
      if (cancelled || !id) return

      // Preloaded from plan (location.state)
      if (preloaded?.exercises?.length > 0) {
        for (const ex of preloaded.exercises) {
          addExercise({ id: ex.id || ex.name, name: ex.name, muscleGroup: ex.muscleGroup || '' })
        }
        return
      }

      // Fallback: load from ?exercises= URL param
      const exIds = (searchParams.get('exercises') ?? '')
        .split(',').map(s => s.trim()).filter(Boolean)
      if (!exIds.length) return
      const { data, error: err } = await supabase
        .from('exercises')
        .select('*')
        .in('id', exIds)
      if (err) {
        setBootError(err.message)
        return
      }
      for (const ex of data ?? []) addExercise(ex)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const alreadyAddedIds = useMemo(
    () => new Set(exercises.map(e => e.exerciseId)),
    [exercises]
  )

  const { showXPToast } = useXPToast()
  function handleVoiceManualSearch(spokenName) {
    setPickerInitialSearch(spokenName);
    setPickerOpen(true);
  }

  async function handleFinish() {
    const summary = await finishSession()
    if (summary) {
      if (summary.xpResult) showXPToast(summary.xpResult)
      navigate(`/workout/summary/${summary.workoutId}`, {
        state: { summary: { ...summary, planName: preloaded?.planName || '' } },
        replace: true,
      })
    }
  }

  async function handleCancel() {
    await cancelSession()
    setConfirmCancel(false)
    navigate('/workout', { replace: true })
  }

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: 48 }}>

      {/* ── Fixed top bar ────────────────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <button
          onClick={() => setConfirmCancel(true)}
          style={{ fontSize: 14, fontWeight: 500, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← End
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", fontVariantNumeric: 'tabular-nums' }}>
          {formatElapsed(elapsedSeconds)}
        </span>
        <PrimaryButton
          onClick={handleFinish}
          disabled={isSaving || !sessionId}
          style={{ width: 'auto', height: 'auto', padding: '6px 16px', fontSize: 14, fontWeight: 500, borderRadius: 12, boxShadow: 'none', background: 'var(--bg-hover)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
        >
          {isSaving ? '…' : 'Finish'}
        </PrimaryButton>
      </div>

      {/* ── Error banner ─────────────────────────────────────── */}
      {(error || bootError) && (
        <div style={{
          position: 'fixed', top: 56, left: 0, right: 0, zIndex: 49,
          background: 'var(--error-bg)', borderBottom: '1px solid rgba(220,38,38,0.15)',
          padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 12, color: 'var(--error)', flex: 1 }}>{error || bootError}</span>
          <button onClick={() => { clearError(); setBootError(null) }} style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* ── Rest timer banner ─────────────────────────────────── */}
      {restTimer.active && (
        <div style={{
          position: 'sticky', top: 56, zIndex: 40,
          background: 'var(--warning-bg)', borderBottom: '1px solid rgba(133,79,11,0.15)',
          padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 20 }}>
              REST
            </span>
            <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
              {formatMmSs(restTimer.secondsLeft)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: '−30s', delta: -30 }, { label: '+30s', delta: 30 }].map(({ label, delta }) => (
              <button
                key={label}
                onClick={() => setRestDuration(Math.max(5, restTimer.secondsLeft + delta))}
                style={{ height: 32, padding: '0 10px', border: '1px solid rgba(133,79,11,0.25)', borderRadius: 8, fontSize: 12, fontWeight: 500, color: 'var(--warning)', background: 'var(--bg-elevated)', cursor: 'pointer' }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={skipRest}
              style={{ height: 32, padding: '0 10px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'white', background: 'var(--warning)', cursor: 'pointer' }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ── Workout title ─────────────────────────────────────── */}
      <div style={{ paddingTop: 72, paddingLeft: 20, paddingRight: 20, paddingBottom: 4 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          {preloaded?.planName || 'Workout'}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
          {exercises.length === 0
            ? 'No exercises yet'
            : `${exercises.length} exercise${exercises.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* ── Loading spinner ───────────────────────────────────── */}
      {!sessionId && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--text-primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Starting session…</p>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {sessionId && exercises.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px', gap: 16, textAlign: 'center' }}>
          <button
            onClick={() => setPickerOpen(true)}
            style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--bg-pill)', border: 'none', cursor: 'pointer', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            +
          </button>
          <div>
            <p style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>Add your first exercise</p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>Tap to pick from the library</p>
          </div>
        </div>
      )}

      {/* ── Scrollable exercise list ──────────────────────────── */}
      {sessionId && exercises.map(ex => (
        <div key={ex.exerciseId} style={{ margin: '12px 20px 0', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>

          {/* Exercise header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              onClick={() => setDetailSheetName(ex.exerciseName)}
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex.exerciseName}
                </p>
                {ex.muscleGroup && (
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{ex.muscleGroup}</p>
                )}
              </div>
              <Info size={14} color="var(--text-cta)" style={{ flexShrink: 0 }} />
            </button>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
              <button
                onClick={() => handleCheckForm(ex)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--success-bg)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Form check"
              >
                <Camera size={14} color="var(--success)" />
              </button>
              <button
                onClick={() => removeExercise(ex.exerciseId)}
                style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-pill)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Remove exercise"
              >
                <X size={14} color="var(--text-tertiary)" />
              </button>
            </div>
          </div>

          {/* Set header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 68px 64px 44px 44px', gap: 6, padding: '0 4px', marginBottom: 6 }}>
            {['SET', 'PREVIOUS', 'KG', 'REPS', '', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: "var(--text-tertiary)", textAlign: i >= 2 ? 'center' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</span>
            ))}
          </div>

          {/* Set rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ex.sets.map(set => {
              const exPerf   = previousPerf[ex.exerciseName] ?? {}
              const prevKeys = Object.keys(exPerf).map(Number).sort((a, b) => a - b)
              // Match by set number; fall back to last available set from prior session
              const prevKey  = exPerf[set.setNumber]
                ? set.setNumber
                : prevKeys.length ? prevKeys[prevKeys.length - 1] : null
              const prevData = prevKey !== null ? exPerf[prevKey] : null
              const prevText = prevData
                ? `${prevData.weight_kg ?? 0} × ${prevData.reps_completed ?? 0}`
                : null

              return (
                <SwipeableSetRow
                  key={set.setNumber}
                  set={set}
                  prevData={prevData}
                  prevText={prevText}
                  onUpdate={(field, val) => updateSet(ex.exerciseId, set.setNumber, field, val)}
                  onComplete={(fw, fr) => completeSet(ex.exerciseId, set.setNumber, { fallbackWeight: fw, fallbackReps: fr })}
                  onRemove={() => removeSet(ex.exerciseId, set.setNumber)}
                />
              )
            })}
          </div>

          {/* Add Set */}
          <button
            onClick={() => addSet(ex.exerciseId)}
            style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: 'var(--text-cta)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 4px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={13} /> Add Set
          </button>
        </div>
      ))}

      {/* ── Bottom actions ────────────────────────────────────── */}
      {sessionId && (
        <div style={{ margin: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setPickerInitialSearch(''); setPickerOpen(true); }}
              style={{
                flex: 1, height: 48, borderRadius: 12, border: '1.5px dashed var(--border-strong)',
                background: 'transparent', fontSize: 14, fontWeight: 500, color: "var(--text-primary)", cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> Add Exercise
            </button>
            {isActive && (
              <button
                onClick={() => setVoiceRecorderOpen(true)}
                style={{
                  width: 48, height: 48, borderRadius: 12, border: '1.5px solid var(--border-strong)',
                  background: 'var(--bg-pill)', color: 'var(--text-primary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
                title="Log exercise by voice"
              >
                <Mic size={18} />
              </button>
            )}
          </div>
          <PrimaryButton
            onClick={handleFinish}
            disabled={isSaving || exercises.length === 0}
            style={{ background: 'var(--cta-bg)', border: '1px solid var(--cta-border)', color: 'var(--cta-text)' }}
          >
            {isSaving ? 'Saving…' : 'Finish Workout'}
          </PrimaryButton>
        </div>
      )}

      {/* ── Exercise picker ───────────────────────────────────── */}
      {pickerOpen && (
        <ExercisePicker
          onSelect={ex => { addExercise({ id: ex.id, name: ex.name, muscle_group: ex.muscle || '' }); setPickerOpen(false) }}
          onClose={() => { setPickerOpen(false); setPickerInitialSearch('') }}
          preSelected={exercises.map(e => e.exerciseName)}
          initialSearch={pickerInitialSearch}
        />
      )}

      {/* ── Voice workout recorder ────────────────────────────── */}
      {voiceRecorderOpen && isActive && (
        <VoiceWorkoutRecorder
          onClose={() => setVoiceRecorderOpen(false)}
          onManualSearch={handleVoiceManualSearch}
        />
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel workout?"
        body="All progress will be lost."
        confirmLabel="Cancel workout"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
      />

      <FormCoachModal
        isOpen={formCoachOpen}
        onClose={() => setFormCoachOpen(false)}
        exerciseName={formCoachExercise}
        onFormScore={handleFormScore}
      />

      <ExerciseDetailSheet
        isOpen={!!detailSheetName}
        exerciseName={detailSheetName}
        onClose={() => setDetailSheetName(null)}
      />
    </div>
  )
}
