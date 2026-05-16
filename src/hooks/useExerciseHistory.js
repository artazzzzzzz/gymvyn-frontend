import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabase'

function epley1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

const EMPTY = {
  loading: false,
  sessions: [],
  stats: {
    heaviestWeight: { value: 0, date: null },
    estimated1RM: { value: 0, date: null },
    bestSetVolume: { value: 0, date: null, weight: 0, reps: 0 },
    mostReps: { value: 0, date: null, weight: 0 },
    totalSets: 0,
  },
  chartData: [],
}

export function useExerciseHistory(exerciseName, userId) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [rawSets, setRawSets]   = useState([])

  useEffect(() => {
    if (!exerciseName || !userId) {
      setSessions([])
      setRawSets([])
      setLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('workout_set_logs')
          .select('set_number, weight_kg, reps_completed, form_score, workout_log_id, created_at, workout_log:workout_logs!inner(id, started_at, duration_minutes, user_id)')
          .eq('exercise_name', exerciseName)
          .eq('workout_log.user_id', userId)
          .order('created_at', { ascending: false })
          .limit(500)

        if (error) throw error
        if (cancelled) return

        setRawSets(data ?? [])

        // Group sets by workout_log_id into sessions
        const map = new Map()
        for (const row of data ?? []) {
          const logId = row.workout_log_id
          if (!map.has(logId)) {
            map.set(logId, {
              id: logId,
              date: row.workout_log?.started_at ?? row.created_at,
              duration: row.workout_log?.duration_minutes ?? null,
              sets: [],
              totalVolume: 0,
            })
          }
          const session = map.get(logId)
          const vol = (row.weight_kg ?? 0) * (row.reps_completed ?? 0)
          session.sets.push({
            set_number: row.set_number,
            weight_kg: row.weight_kg ?? 0,
            reps_completed: row.reps_completed ?? 0,
            form_score: row.form_score ?? null,
          })
          session.totalVolume += vol
        }

        // Sort sessions by date descending, and sets within each by set_number
        const sessionsArr = [...map.values()]
          .sort((a, b) => new Date(b.date) - new Date(a.date))
        for (const s of sessionsArr) {
          s.sets.sort((a, b) => a.set_number - b.set_number)
        }

        setSessions(sessionsArr)
      } catch (err) {
        console.error('[useExerciseHistory]', err)
        setSessions([])
        setRawSets([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [exerciseName, userId])

  // ── Computed stats ────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    if (rawSets.length === 0) return EMPTY.stats

    let heaviest = { value: 0, date: null }
    let best1RM = { value: 0, date: null }
    let bestVol = { value: 0, date: null, weight: 0, reps: 0 }
    let mostReps = { value: 0, date: null, weight: 0 }

    for (const row of rawSets) {
      const w = row.weight_kg ?? 0
      const r = row.reps_completed ?? 0
      const d = row.workout_log?.started_at ?? row.created_at
      const vol = w * r
      const e1rm = epley1RM(w, r)

      if (w > heaviest.value) heaviest = { value: w, date: d }
      if (e1rm > best1RM.value) best1RM = { value: e1rm, date: d }
      if (vol > bestVol.value) bestVol = { value: vol, date: d, weight: w, reps: r }
      if (r > mostReps.value) mostReps = { value: r, date: d, weight: w }
    }

    return {
      heaviestWeight: heaviest,
      estimated1RM: best1RM,
      bestSetVolume: bestVol,
      mostReps,
      totalSets: rawSets.length,
    }
  }, [rawSets])

  // ── Chart data (per-session aggregates, chronological) ────────────────────

  const chartData = useMemo(() => {
    if (sessions.length === 0) return []
    return [...sessions]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(s => {
        let maxW = 0, maxE1RM = 0, maxVol = 0
        for (const set of s.sets) {
          if (set.weight_kg > maxW) maxW = set.weight_kg
          const e = epley1RM(set.weight_kg, set.reps_completed)
          if (e > maxE1RM) maxE1RM = e
          const v = set.weight_kg * set.reps_completed
          if (v > maxVol) maxVol = v
        }
        return {
          date: new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          rawDate: s.date,
          heaviestWeight: maxW,
          est1RM: Math.round(maxE1RM * 10) / 10,
          bestSetVolume: maxVol,
        }
      })
  }, [sessions])

  return { loading, sessions, stats, chartData }
}
