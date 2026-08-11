import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useAuth } from './useAuth'

export function useWorkoutHistory() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [recentWorkouts,  setRecentWorkouts]  = useState([])
  const [personalRecords, setPersonalRecords] = useState({})
  const [totalWorkouts,   setTotalWorkouts]   = useState(0)
  const [totalVolume,     setTotalVolume]     = useState(0)
  const [thisWeekWorkouts,setThisWeekWorkouts]= useState(0)
  const [longestStreak,   setLongestStreak]   = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)

  useEffect(() => {
    if (!userId) {
      setRecentWorkouts([])
      setPersonalRecords({})
      setTotalWorkouts(0)
      setTotalVolume(0)
      setThisWeekWorkouts(0)
      setLongestStreak(0)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function fetchHistory() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('workout_logs')
          .select('*')
          .eq('user_id', userId)
          // Exclude rest days, but NOT via a plain .neq('notes', 'Rest day') —
          // in Postgres, NULL != 'Rest day' evaluates to NULL, not true, so
          // that filter silently dropped every log with no notes (the common
          // case) from recentWorkouts, breaking "Repeat Last" for most users.
          .or('notes.is.null,notes.neq.Rest day')
          .order('created_at', { ascending: false })
          .limit(20)

        if (fetchError) throw fetchError
        if (cancelled) return

        const logs = data ?? []

        // Normalise each row — exercises may be stored as a JSONB column or
        // already parsed by the Supabase JS client.
        const workouts = logs.map(row => ({
          ...row,
          exercises: Array.isArray(row.exercises) ? row.exercises : [],
          started_at: row.started_at ?? row.created_at,
        }))

        // ── Derived stats ────────────────────────────────────────────────────

        // Personal records: highest weight per exercise across all workouts
        const prs = {}
        let volSum = 0
        workouts.forEach(w => {
          w.exercises.forEach(ex => {
            ex.sets?.forEach(s => {
              const w_kg = s.weight_kg ?? 0
              const reps = s.reps_completed ?? 0
              volSum += w_kg * reps

              if (w_kg > 0) {
                const key = ex.name
                if (!prs[key] || w_kg > prs[key].maxWeight) {
                  prs[key] = { name: key, maxWeight: w_kg, date: w.started_at }
                }
              }
            })
          })
        })

        // This-week workout count
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setHours(0, 0, 0, 0)
        startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
        const weekCount = workouts.filter(w => {
          const d = new Date(w.started_at)
          return d >= startOfWeek
        }).length

        // Longest consecutive-day streak (all-time, descending sort already)
        const dayStrings = workouts
          .map(w => new Date(w.started_at).toDateString())
          .filter((v, i, a) => a.indexOf(v) === i) // unique days
          .sort((a, b) => new Date(b) - new Date(a))

        let streak = 0
        let maxStreak = 0
        let prev = null
        for (const ds of dayStrings) {
          const d = new Date(ds)
          if (prev === null) {
            streak = 1
          } else {
            const diffDays = Math.round((prev - d) / 86_400_000)
            streak = diffDays === 1 ? streak + 1 : 1
          }
          maxStreak = Math.max(maxStreak, streak)
          prev = d
        }

        setRecentWorkouts(workouts)
        setPersonalRecords(prs)
        setTotalWorkouts(workouts.length)
        setTotalVolume(volSum)
        setThisWeekWorkouts(weekCount)
        setLongestStreak(maxStreak)
      } catch (err) {
        if (!cancelled) {
          console.error('[useWorkoutHistory]', err)
          setError('Failed to load workout history.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [userId])

  return {
    recentWorkouts,
    personalRecords,
    totalWorkouts,
    totalVolume,
    thisWeekWorkouts,
    longestStreak,
    loading,
    error,
  }
}
