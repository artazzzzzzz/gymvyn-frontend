import { useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from './useAuth'
import { finishWorkout } from '../utils/api'

export function useWorkoutSession() {
  const { user } = useAuth()

  const [sessionId,     setSessionId]     = useState(null)
  const [isActive,      setIsActive]      = useState(false)
  const [exercises,     setExercises]     = useState([])
  const [elapsedSeconds,setElapsedSeconds]= useState(0)
  const [isSaving,      setIsSaving]      = useState(false)
  const [error,         setError]         = useState(null)

  // Rest timer
  const [restTimer,    setRestTimer]    = useState({ active: false, secondsLeft: 0, totalSeconds: 0 })
  const [restDuration, setRestDuration] = useState(90)

  const startedAtRef      = useRef(null)
  const elapsedIntervalRef = useRef(null)
  const restIntervalRef    = useRef(null)

  // ── Elapsed counter (starts/stops with isActive) ──────────────────────────

  useEffect(() => {
    if (!isActive) return
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1)
    }, 1000)
    return () => clearInterval(elapsedIntervalRef.current)
  }, [isActive])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearInterval(elapsedIntervalRef.current)
      clearInterval(restIntervalRef.current)
    }
  }, [])

  // ── Rest timer (managed imperatively to support restart) ──────────────────

  function startRestTimer(duration) {
    clearInterval(restIntervalRef.current)
    setRestTimer({ active: true, secondsLeft: duration, totalSeconds: duration })
    restIntervalRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev.secondsLeft <= 1) {
          clearInterval(restIntervalRef.current)
          return { active: false, secondsLeft: 0, totalSeconds: prev.totalSeconds }
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 }
      })
    }, 1000)
  }

  function skipRest() {
    clearInterval(restIntervalRef.current)
    setRestTimer(prev => ({ ...prev, active: false, secondsLeft: 0 }))
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────

  async function startSession() {
    if (!user) { setError('Not logged in'); return null }
    const now = new Date().toISOString()
    startedAtRef.current = now
    const localId = crypto.randomUUID()
    setSessionId(localId)
    setIsActive(true)
    setElapsedSeconds(0)
    setExercises([])
    return localId
  }

  async function finishSession() {
    if (!sessionId) return null
    setIsSaving(true)
    try {
      const now = new Date()
      const startedAt = startedAtRef.current ? new Date(startedAtRef.current) : now
      const durationMinutes = Math.max(1, Math.round((now - startedAt) / 60_000))

      // Create the workout_logs row now (only on finish, never on start).
      const { data: logRow, error: insertErr } = await supabase
        .from('workout_logs')
        .insert({ user_id: user.id, started_at: startedAtRef.current })
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
        startedAt:      startedAtRef.current || startedAt.toISOString(),
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
    setIsActive(false)
    setSessionId(null)
    setExercises([])
    setElapsedSeconds(0)
    clearInterval(elapsedIntervalRef.current)
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
