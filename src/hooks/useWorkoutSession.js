import { useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from './useAuth'

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
    try {
      const now = new Date().toISOString()
      startedAtRef.current = now
      const { data, error: err } = await supabase
        .from('workout_logs')
        .insert({ user_id: user.id, started_at: now })
        .select('id')
        .single()
      if (err) throw err
      setSessionId(data.id)
      setIsActive(true)
      setElapsedSeconds(0)
      setExercises([])
      return data.id
    } catch (err) {
      setError(err.message)
      return null
    }
  }

  async function finishSession() {
    if (!sessionId) return null
    setIsSaving(true)
    try {
      const now = new Date()
      const startedAt = startedAtRef.current ? new Date(startedAtRef.current) : now
      const durationMinutes = Math.max(1, Math.round((now - startedAt) / 60_000))

      // Flatten completed sets for workout_set_logs
      const setRows = []
      for (const ex of exercises) {
        for (const s of ex.sets.filter(s => s.completed)) {
          setRows.push({
            workout_log_id: sessionId,
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

      // Update the workout_logs row
      const { error: updateErr } = await supabase
        .from('workout_logs')
        .update({
          completed_at:      now.toISOString(),
          duration_minutes:  durationMinutes,
          exercises:         exercisesSnapshot,
        })
        .eq('id', sessionId)
      if (updateErr) throw updateErr

      // Insert individual set logs
      if (setRows.length > 0) {
        const { error: setsErr } = await supabase
          .from('workout_set_logs')
          .insert(setRows)
        if (setsErr) throw setsErr
      }

      // Stop timers
      setIsActive(false)
      skipRest()

      return {
        id:             sessionId,
        durationMinutes,
        totalSets:      setRows.length,
        totalVolume:    setRows.reduce((sum, s) => sum + s.weight_kg * s.reps_completed, 0),
        exerciseCount:  exercises.length,
        exercises:      exercisesSnapshot,
      }
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelSession() {
    try {
      if (sessionId) {
        await supabase.from('workout_set_logs').delete().eq('workout_log_id', sessionId)
        await supabase.from('workout_logs').delete().eq('id', sessionId)
      }
    } catch (err) {
      console.error('[cancelSession]', err)
    } finally {
      setIsActive(false)
      setSessionId(null)
      setExercises([])
      setElapsedSeconds(0)
      clearInterval(elapsedIntervalRef.current)
      skipRest()
    }
  }

  // ── Exercise management ───────────────────────────────────────────────────

  function addExercise(ex) {
    setExercises(prev => {
      if (prev.some(e => e.exerciseId === ex.id)) return prev
      return [...prev, {
        exerciseId:   ex.id,
        exerciseName: ex.name,
        muscleGroup:  ex.muscle_group ?? '',
        sets:         [],
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
      return { ...ex, sets: ex.sets.filter(s => s.setNumber !== setNumber) }
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

  function completeSet(exerciseId, setNumber) {
    setExercises(prev => prev.map(ex => {
      if (ex.exerciseId !== exerciseId) return ex
      return {
        ...ex,
        sets: ex.sets.map(s =>
          s.setNumber === setNumber ? { ...s, completed: true } : s
        ),
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
