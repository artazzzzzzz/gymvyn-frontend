import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

function calcStreaks(dates) {
  if (!dates.length) return { current: 0, best: 0 }

  const unique = [...new Set(dates)].sort() // ascending YYYY-MM-DD

  // Best streak
  let best = 1
  let run = 1
  for (let i = 1; i < unique.length; i++) {
    const diff = (new Date(unique[i]) - new Date(unique[i - 1])) / 86400000
    if (diff === 1) { run++; if (run > best) best = run }
    else run = 1
  }

  // Current streak — count backwards from today (or yesterday if today is inactive)
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  const set = new Set(unique)
  const startFrom = set.has(todayStr) ? todayStr : set.has(yesterStr) ? yesterStr : null

  let current = 0
  if (startFrom) {
    let cursor = new Date(startFrom)
    while (set.has(cursor.toISOString().slice(0, 10))) {
      current++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return { current, best }
}

export function useStreak(userId) {
  const [streak, setStreak] = useState({ current: 0, best: 0, loading: true })

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const [{ data: logs }, { data: entries }] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('started_at')
          .eq('user_id', userId)
          .not('completed_at', 'is', null),
        supabase
          .from('progress_entries')
          .select('logged_at')
          .eq('user_id', userId),
      ])

      if (cancelled) return

      const dates = [
        ...(logs ?? []).map(r => r.started_at?.slice(0, 10)),
        ...(entries ?? []).map(r => r.logged_at?.slice(0, 10)),
      ].filter(Boolean)

      setStreak({ ...calcStreaks(dates), loading: false })
    }

    load()
    return () => { cancelled = true }
  }, [userId])

  return streak
}
