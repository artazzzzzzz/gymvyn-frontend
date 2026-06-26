import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from './useAuth'
import { finishWorkout } from '../utils/api'

// Web Audio beep + Android vibrate. Silent if AudioContext was never primed
// inside a user gesture (iOS Safari requirement) — vibrate still fires.
function fireRestEndCue(ctx) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(200)
    }
  } catch { /* noop */ }
  try {
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.4,    ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  } catch { /* noop */ }
}

export function useWorkoutSession() {
  const { user } = useAuth()

  const [sessionId,        setSessionId]        = useState(null)
  const [isActive,         setIsActive]         = useState(false)
  const [exercises,        setExercises]        = useState([])
  const [restActive,       setRestActive]       = useState(false)
  const [restTotalSeconds, setRestTotalSeconds] = useState(0)
  const [restDuration,     setRestDuration]     = useState(90)
  const [isSaving,         setIsSaving]         = useState(false)
  const [error,            setError]            = useState(null)

  // Tick state drives ~4Hz re-renders so derived elapsed/remaining values update.
  // It is NOT the source of truth — Date.now() against the stored start timestamp is.
  const [, setTick] = useState(0)
  const forceTick = useCallback(() => setTick(t => (t + 1) & 0xffff), [])

  // Source-of-truth refs (immune to setInterval throttling when tab is backgrounded)
  const workoutStartedAtRef = useRef(null)   // ms epoch
  const restStartedAtRef    = useRef(null)   // ms epoch
  const restTotalSecondsRef = useRef(0)
  const beepFiredRef        = useRef(false)
  const tickIntervalRef     = useRef(null)
  const audioCtxRef         = useRef(null)

  // ── Tick driver: re-render while any timer is live ────────────────────────
  useEffect(() => {
    if (!isActive && !restActive) return
    tickIntervalRef.current = setInterval(forceTick, 250)
    return () => clearInterval(tickIntervalRef.current)
  }, [isActive, restActive, forceTick])

  // ── visibilitychange: force an immediate re-render on return so the displayed
  //    elapsed/remaining snaps to wall-clock time without waiting for the tick ──
  useEffect(() => {
    function onVis() { if (!document.hidden) forceTick() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [forceTick])

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => clearInterval(tickIntervalRef.current), [])

  // ── Derive elapsed/remaining from timestamps every render ─────────────────
  const nowMs = Date.now()
  const elapsedSeconds = (isActive && workoutStartedAtRef.current)
    ? Math.max(0, Math.floor((nowMs - workoutStartedAtRef.current) / 1000))
    : 0

  let restSecondsLeft = 0
  if (restActive && restStartedAtRef.current != null) {
    const restElapsed = Math.floor((nowMs - restStartedAtRef.current) / 1000)
    restSecondsLeft = Math.max(0, restTotalSecondsRef.current - restElapsed)
  }

  // Fire the beep/vibrate exactly once when the rest ends. Guarded by a ref so
  // it never re-fires across re-renders, and only inside an effect so we never
  // dispatch side effects from render.
  useEffect(() => {
    if (!restActive) return
    if (restSecondsLeft > 0) return
    if (beepFiredRef.current) return
    beepFiredRef.current = true
    fireRestEndCue(audioCtxRef.current)
    setRestActive(false)
  }, [restActive, restSecondsLeft])

  const restTimer = {
    active:        restActive,
    secondsLeft:   restSecondsLeft,
    totalSeconds:  restTotalSeconds,
  }

  // ── Audio priming. Must run inside a user gesture (iOS Safari requirement). ──
  function primeAudio() {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        audioCtxRef.current = new Ctx()
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    } catch { /* noop */ }
  }

  // ── Rest timer controls ───────────────────────────────────────────────────
  function startRestTimer(duration) {
    restStartedAtRef.current     = Date.now()
    restTotalSecondsRef.current  = duration
    beepFiredRef.current         = false
    setRestTotalSeconds(duration)
    setRestActive(true)
  }

  function skipRest() {
    restStartedAtRef.current = null
    beepFiredRef.current     = true   // suppress any pending beep for this rest
    setRestActive(false)
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────
  async function startSession() {
    if (!user) { setError('Not logged in'); return null }
    primeAudio()                              // first opportunity inside a gesture
    workoutStartedAtRef.current = Date.now()
    const localId = crypto.randomUUID()
    setSessionId(localId)
    setIsActive(true)
    setExercises([])
    return localId
  }

  async function finishSession() {
    if (!sessionId) return null
    setIsSaving(true)
    try {
      const startedAtMs   = workoutStartedAtRef.current ?? Date.now()
      const startedAtIso  = new Date(startedAtMs).toISOString()
      const durationMinutes = Math.max(1, Math.round((Date.now() - startedAtMs) / 60_000))

      // Create the workout_logs row now (only on finish, never on start).
      const { data: logRow, error: insertErr } = await supabase
        .from('workout_logs')
        .insert({ user_id: user.id, started_at: startedAtIso })
        .select('id')
        .single()
      if (insertErr) throw insertErr
      const realId = logRow.id

      // Flatten completed sets for workout_set_logs
      const setRows = []
      for (const ex of exercises) {
        for (const s of ex.sets.filter(s => s.completed)) {
          setRows.push({
            workout_log_id: realId,
            exercise_id:    ex.exerciseId,
            exercise_name:  ex.exerciseName,
            set_number:     s.setNumber,
            weight_kg:      parseFloat(s.weight)  || 0,
            reps_completed: parseInt(s.reps, 10)  || 0,
            form_score:     s.form_score ?? null,
          })
        }
      }

      // Build the JSONB snapshot for workout_logs.exercises (used by useWorkoutHistory)
      const exercisesSnapshot = exercises.map(ex => ({
        name: ex.exerciseName,
        sets: ex.sets.filter(s => s.completed).map(s => ({
          set_number:     s.setNumber,
          weight_kg:      parseFloat(s.weight)  || 0,
          reps_completed: parseInt(s.reps, 10)  || 0,
          form_score:     s.form_score ?? null,
        })),
      }))

      // Save via backend (service-role key) to bypass PostgREST schema-cache
      // issue with workout_logs.exercises JSONB column.
      const finishRes = await finishWorkout({
        sessionId: realId,
        durationMinutes,
        exercises: exercisesSnapshot,
        sets:      setRows,
      })

      // Stop timers
      setIsActive(false)
      skipRest()

      return {
        workoutId:      realId,
        startedAt:      startedAtIso,
        durationMinutes,
        totalSets:      setRows.length,
        totalVolume:    setRows.reduce((sum, s) => sum + s.weight_kg * s.reps_completed, 0),
        exerciseCount:  exercises.length,
        xpResult:       finishRes?.xpResult || null,
        // Display-friendly shape for WorkoutSummary (separate from the DB JSONB snapshot)
        exercises: exercises
          .map(ex => ({
            exerciseId:   ex.exerciseId,
            exerciseName: ex.exerciseName,
            muscleGroup:  ex.muscleGroup,
            sets: ex.sets
              .filter(s => s.completed)
              .map(s => ({
                setNumber: s.setNumber,
                weight:    parseFloat(s.weight)  || 0,
                reps:      parseInt(s.reps, 10)  || 0,
              })),
          }))
          .filter(ex => ex.sets.length > 0),
      }
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  function cancelSession() {
    workoutStartedAtRef.current = null
    setIsActive(false)
    setSessionId(null)
    setExercises([])
    skipRest()
  }

  // ── Exercise management ───────────────────────────────────────────────────

  function addExercise(ex) {
    setExercises(prev => {
      if (prev.some(e => e.exerciseId === ex.id)) return prev
      return [...prev, {
        exerciseId:   ex.id,
        exerciseName: ex.name,
        muscleGroup:  ex.muscle_group ?? ex.muscleGroup ?? '',
        sets:         [{ setNumber: 1, weight: '', reps: '', completed: false, form_score: null }],
      }]
    })
  }

  function removeExercise(exerciseId) {
    setExercises(prev => prev.filter(e => e.exerciseId !== exerciseId))
  }

  // ── Set management ────────────────────────────────────────────────────────

  function addSet(exerciseId) {
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex
      const nextNum = (ex.sets.at?.(-1)?.setNumber ?? ex.sets[ex.sets.length - 1]?.setNumber ?? 0) + 1
      return {
        ...ex,
        sets: [
          ...ex.sets,
          { setNumber: nextNum, weight: '', reps: '', completed: false, form_score: null },
        ],
      }
    }))
  }

  function removeSet(exerciseId, setNumber) {
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex
      const filtered = ex.sets.filter(s => s.setNumber !== setNumber)
      // Renumber remaining sets sequentially so display is always 1, 2, 3…
      return { ...ex, sets: filtered.map((s, i) => ({ ...s, setNumber: i + 1 })) }
    }))
  }

  function updateSet(exerciseId, setNumber, field, value) {
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex
      return {
        ...ex,
        sets: ex.sets.map(s =>
          s.setNumber === setNumber ? { ...s, [field]: value } : s
        ),
      }
    }))
  }

  function completeSet(exerciseId, setNumber, { fallbackWeight, fallbackReps } = {}) {
    // completeSet runs from a tap handler — a guaranteed user gesture, so we
    // (re-)prime the AudioContext here too as a belt-and-suspenders for cases
    // where the session was restored without going through startSession.
    primeAudio()
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.setNumber !== setNumber) return s
          // Apply shadow/previous value only when the user left the field empty
          const w = s.weight !== '' ? s.weight : (fallbackWeight != null ? String(fallbackWeight) : '')
          const r = s.reps   !== '' ? s.reps   : (fallbackReps   != null ? String(fallbackReps)   : '')
          return { ...s, completed: true, weight: w, reps: r }
        }),
      }
    }))
    startRestTimer(restDuration)
  }

  function updateSetFormScore(exerciseId, setNumber, score) {
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex
      return {
        ...ex,
        sets: ex.sets.map(s =>
          s.setNumber === setNumber ? { ...s, form_score: score } : s
        ),
      }
    }))
  }

  function clearError() {
    setError(null)
  }

  return {
    sessionId,
    exercises,
    isActive,
    elapsedSeconds,
    restTimer,
    restDuration,
    isSaving,
    error,
    startSession,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    updateSet,
    completeSet,
    updateSetFormScore,
    finishSession,
    cancelSession,
    skipRest,
    setRestDuration,
    clearError,
  }
}
