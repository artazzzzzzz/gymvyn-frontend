import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  X, Check, Plus, Trash2, Camera, ChevronLeft, Loader2, AlertCircle,
  Search, Dumbbell, ScanLine, SkipForward,
} from 'lucide-react'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { useExercises } from '../hooks/useExercises'
import { supabase } from '../utils/supabase'
import { exercises as FORM_RULES } from '../utils/formRules'
import { useAuth } from '../hooks/useAuth'
import FormCoachModal from '../components/FormCoachModal'

function hasFormCoach(name) {
  if (!name) return false
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return Object.keys(FORM_RULES).some(key => {
    const k = key.toLowerCase().replace(/[^a-z0-9]/g, '')
    return n === k || n.includes(k) || k.includes(n)
  })
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
      'fixed top-0 inset-x-0 z-40 bg-gray-900 border-b border-white/[0.08] transition-transform duration-200',
      active ? 'translate-y-0' : '-translate-y-full',
    ].join(' ')}>
      <div className="max-w-lg mx-auto px-5 pt-3 pb-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 ring-1 ring-inset ring-orange-500/30 flex items-center justify-center">
              <SkipForward size={14} className="text-orange-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Rest</p>
              <p className="text-white font-mono font-bold text-base leading-tight">{formatMmSs(secondsLeft)}</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-xs text-gray-300 hover:text-white font-semibold px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
          >
            Skip
          </button>
        </div>
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
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
                  : 'bg-white/[0.03] text-gray-400 ring-white/10 hover:text-white',
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
      set.completed ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]',
    ].join(' ')}>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold ${set.completed ? 'text-emerald-300' : 'text-gray-300'}`}>
          {set.setNumber}
        </span>
      </div>
      <span className="text-xs text-gray-500 truncate">{prev}</span>
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
          className="w-9 h-9 rounded-md bg-white/[0.04] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.1] transition-colors"
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

  const formCoachAvailable = hasFormCoach(exercise.exerciseName)

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
            disabled={!formCoachAvailable}
            className={[
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              formCoachAvailable
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-white/[0.03] text-gray-600 ring-1 ring-inset ring-white/[0.06] cursor-not-allowed',
            ].join(' ')}
            title={formCoachAvailable ? 'Check form' : 'No form coach for this exercise'}
          >
            <Camera size={15} />
          </button>
          <button
            onClick={onRemove}
            className="w-9 h-9 rounded-xl bg-white/[0.03] text-gray-500 hover:text-red-300 hover:bg-red-500/15 flex items-center justify-center transition-colors"
            title="Remove exercise"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[28px_1fr_72px_64px_40px] gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
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
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
      >
        <Plus size={13} />
        Add Set
      </button>
    </div>
  )
}

// ─── Exercise Picker Modal ───────────────────────────────────────────────────

function ExercisePickerModal({ open, onClose, onPick, alreadyAddedIds }) {
  const {
    filteredExercises, loading, searchQuery, setSearchQuery,
    muscleGroup, setMuscleGroup, muscleGroups,
  } = useExercises()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex flex-col">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-white/[0.06]">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-white font-semibold text-base">Add Exercise</h2>
      </header>

      <div className="px-5 py-3 space-y-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search exercises…"
            className="w-full bg-gray-900 border border-white/[0.07] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/40"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setMuscleGroup('')}
            className={[
              'shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full ring-1 ring-inset transition-colors',
              muscleGroup === ''
                ? 'bg-orange-500/20 text-orange-200 ring-orange-500/40'
                : 'bg-white/[0.03] text-gray-400 ring-white/10',
            ].join(' ')}
          >
            All
          </button>
          {muscleGroups.map(g => (
            <button
              key={g}
              onClick={() => setMuscleGroup(g)}
              className={[
                'shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full ring-1 ring-inset transition-colors',
                muscleGroup === g
                  ? 'bg-orange-500/20 text-orange-200 ring-orange-500/40'
                  : 'bg-white/[0.03] text-gray-400 ring-white/10',
              ].join(' ')}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="text-orange-500 animate-spin" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-10">No exercises match</p>
        ) : (
          <ul className="space-y-1.5">
            {filteredExercises.map(ex => {
              const added = alreadyAddedIds.has(ex.id)
              const fc = hasFormCoach(ex.name)
              return (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => !added && onPick(ex)}
                    disabled={added}
                    className={[
                      'w-full text-left bg-gray-900 border border-white/[0.07] rounded-xl p-3 flex items-center gap-3 transition-colors',
                      added ? 'opacity-50' : 'hover:border-orange-500/30',
                    ].join(' ')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                      <Dumbbell size={15} className="text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {ex.muscle_group} · {ex.equipment}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {fc && (
                        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 px-1.5 py-0.5 rounded-full">
                          <ScanLine size={9} className="mr-0.5" />
                          Form
                        </span>
                      )}
                      {added ? (
                        <span className="text-[10px] uppercase font-bold text-gray-500">Added</span>
                      ) : (
                        <Plus size={16} className="text-gray-400" />
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Cancel Confirm ──────────────────────────────────────────────────────────

function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-bold text-base">{title}</h3>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{body}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-white font-semibold text-sm hover:bg-white/[0.1] transition-colors"
          >
            Keep going
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30 font-semibold text-sm hover:bg-red-500/25 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LiveSession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const session = useWorkoutSession()
  const {
    sessionId, exercises, isActive, elapsedSeconds, restTimer, restDuration,
    isSaving, error,
    startSession, addExercise, removeExercise, addSet, removeSet, updateSet,
    completeSet, updateSetFormScore, finishSession, cancelSession, skipRest, setRestDuration,
    clearError,
  } = session

  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [formCoachOpen, setFormCoachOpen] = useState(false)
  const [formCoachExercise, setFormCoachExercise] = useState('')
  const [formCoachTargetExerciseId, setFormCoachTargetExerciseId] = useState(null)
  const [bootError, setBootError] = useState(null)

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
      console.log('[handleFormScore] no completed set yet — score not saved:', score)
      return
    }
    updateSetFormScore(formCoachTargetExerciseId, lastCompleted.setNumber, score)
  }

  // Pre-load exercises from ?exercises= and start the session on mount
  useEffect(() => {
    if (!user || isActive) return
    let cancelled = false
    ;(async () => {
      const id = await startSession()
      if (cancelled || !id) return
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

  async function handleFinish() {
    const summary = await finishSession()
    if (summary) {
      navigate('/workout/summary', { state: { summary }, replace: true })
    }
  }

  async function handleCancel() {
    await cancelSession()
    setConfirmCancel(false)
    navigate('/workout', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-32 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[480px] h-[220px] bg-orange-500/[0.05] blur-[90px] rounded-full pointer-events-none" />

      <RestTimerBar
        restTimer={restTimer}
        restDuration={restDuration}
        onSkip={skipRest}
        onChangeDuration={setRestDuration}
      />

      {/* Top bar */}
      <header className={[
        'sticky top-0 z-30 bg-gray-950/95 backdrop-blur-sm border-b border-white/[0.06] transition-[padding] duration-200',
        restTimer.active ? 'pt-28' : 'pt-12',
      ].join(' ')}>
        <div className="px-5 pb-3 flex items-center justify-between gap-3">
          <button
            onClick={() => setConfirmCancel(true)}
            className="w-9 h-9 rounded-xl bg-white/[0.05] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            title="Cancel workout"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Workout in progress</p>
            <p className="text-white font-mono font-bold text-lg leading-tight">{formatElapsed(elapsedSeconds)}</p>
          </div>
          <button
            onClick={handleFinish}
            disabled={isSaving || !sessionId}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.97] text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(16,185,129,0.35)]"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Finish'}
          </button>
        </div>
      </header>

      <div className="relative z-10 px-5 pt-4 space-y-3">
        {(error || bootError) && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5">
            <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed flex-1">{error || bootError}</p>
            <button onClick={() => { clearError(); setBootError(null) }} className="text-red-300 text-xs font-semibold">Dismiss</button>
          </div>
        )}

        {!sessionId && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={22} className="text-orange-500 animate-spin" />
            <p className="text-gray-400 text-sm">Starting your session…</p>
          </div>
        )}

        {sessionId && exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <button
              onClick={() => setPickerOpen(true)}
              className="w-20 h-20 rounded-3xl bg-orange-500/15 ring-1 ring-inset ring-orange-500/30 flex items-center justify-center text-orange-300 hover:bg-orange-500/25 active:scale-95 transition-all"
            >
              <Plus size={32} />
            </button>
            <div>
              <p className="text-white font-semibold text-base">Add your first exercise</p>
              <p className="text-gray-500 text-sm mt-1">Tap the button to pick from the library</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map(ex => (
              <ExerciseBlock
                key={ex.exerciseId}
                exercise={ex}
                userId={user?.id}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onUpdateSet={updateSet}
                onCompleteSet={completeSet}
                onRemove={() => removeExercise(ex.exerciseId)}
                onCheckForm={handleCheckForm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom add-exercise bar */}
      {sessionId && exercises.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-gray-950/95 backdrop-blur-sm border-t border-white/[0.06]">
          <div className="max-w-lg mx-auto px-5 py-3">
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-[0_0_18px_rgba(249,115,22,0.35)]"
            >
              <Plus size={16} />
              Add Exercise
            </button>
          </div>
        </div>
      )}

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(ex) => { addExercise(ex); setPickerOpen(false) }}
        alreadyAddedIds={alreadyAddedIds}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel workout?"
        body="All progress will be lost and the session will be deleted."
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
    </div>
  )
}
