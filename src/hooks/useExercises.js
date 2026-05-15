import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabase'

// ── Local fallback DB ──────────────────────────────────────────────────────────
// Used when the Supabase `exercises` table is empty or unreachable.

const LOCAL_EXERCISES = [
  { id: 'bench-press',       name: 'Bench Press',        muscle_group: 'Chest',       equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'squat',             name: 'Squat',               muscle_group: 'Legs',        equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'deadlift',          name: 'Deadlift',            muscle_group: 'Back',        equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'overhead-press',    name: 'Overhead Press',      muscle_group: 'Shoulders',   equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'bent-over-row',     name: 'Bent Over Row',       muscle_group: 'Back',        equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'pull-up',           name: 'Pull Up',             muscle_group: 'Back',        equipment: 'Bodyweight',  difficulty: 'Intermediate' },
  { id: 'dip',               name: 'Dip',                 muscle_group: 'Chest',       equipment: 'Bodyweight',  difficulty: 'Intermediate' },
  { id: 'lunge',             name: 'Lunge',               muscle_group: 'Legs',        equipment: 'Bodyweight',  difficulty: 'Beginner'     },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift',   muscle_group: 'Hamstrings',  equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'bicep-curl',        name: 'Bicep Curl',          muscle_group: 'Biceps',      equipment: 'Dumbbell',    difficulty: 'Beginner'     },
  { id: 'tricep-extension',  name: 'Tricep Extension',    muscle_group: 'Triceps',     equipment: 'Cable',       difficulty: 'Beginner'     },
  { id: 'lateral-raise',     name: 'Lateral Raise',       muscle_group: 'Shoulders',   equipment: 'Dumbbell',    difficulty: 'Beginner'     },
  { id: 'leg-press',         name: 'Leg Press',           muscle_group: 'Legs',        equipment: 'Machine',     difficulty: 'Beginner'     },
  { id: 'leg-curl',          name: 'Leg Curl',            muscle_group: 'Hamstrings',  equipment: 'Machine',     difficulty: 'Beginner'     },
  { id: 'calf-raise',        name: 'Calf Raise',          muscle_group: 'Calves',      equipment: 'Machine',     difficulty: 'Beginner'     },
  { id: 'face-pull',         name: 'Face Pull',           muscle_group: 'Shoulders',   equipment: 'Cable',       difficulty: 'Beginner'     },
  { id: 'cable-row',         name: 'Cable Row',           muscle_group: 'Back',        equipment: 'Cable',       difficulty: 'Beginner'     },
  { id: 'chest-fly',         name: 'Chest Fly',           muscle_group: 'Chest',       equipment: 'Dumbbell',    difficulty: 'Beginner'     },
  { id: 'incline-bench',     name: 'Incline Bench Press', muscle_group: 'Chest',       equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'front-squat',       name: 'Front Squat',         muscle_group: 'Legs',        equipment: 'Barbell',     difficulty: 'Advanced'     },
  { id: 'hip-thrust',        name: 'Hip Thrust',          muscle_group: 'Glutes',      equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'plank',             name: 'Plank',               muscle_group: 'Core',        equipment: 'Bodyweight',  difficulty: 'Beginner'     },
  { id: 'arnold-press',      name: 'Arnold Press',        muscle_group: 'Shoulders',   equipment: 'Dumbbell',    difficulty: 'Intermediate' },
  { id: 'hammer-curl',       name: 'Hammer Curl',         muscle_group: 'Biceps',      equipment: 'Dumbbell',    difficulty: 'Beginner'     },
  { id: 'skull-crusher',     name: 'Skull Crusher',       muscle_group: 'Triceps',     equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'good-morning',      name: 'Good Morning',        muscle_group: 'Hamstrings',  equipment: 'Barbell',     difficulty: 'Intermediate' },
  { id: 'box-jump',          name: 'Box Jump',            muscle_group: 'Legs',        equipment: 'Bodyweight',  difficulty: 'Intermediate' },
  { id: 'battle-ropes',      name: 'Battle Ropes',        muscle_group: 'Shoulders',   equipment: 'Other',       difficulty: 'Intermediate' },
  { id: 'farmer-walk',       name: 'Farmer Walk',         muscle_group: 'Forearms',    equipment: 'Dumbbell',    difficulty: 'Beginner'     },
  { id: 'goblet-squat',      name: 'Goblet Squat',        muscle_group: 'Legs',        equipment: 'Dumbbell',    difficulty: 'Beginner'     },
]

export function useExercises() {
  const [allExercises, setAllExercises] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const [searchQuery,       setSearchQuery]       = useState('')
  const [muscleGroup,       setMuscleGroup]       = useState('')
  const [equipment,         setEquipment]         = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await supabase
          .from('exercises')
          .select('id, name, muscle_group, equipment, difficulty, instructions')
          .order('name')

        if (fetchError) throw fetchError
        if (cancelled) return

        // If the table exists but is empty, fall back to local DB
        setAllExercises((data && data.length > 0) ? data : LOCAL_EXERCISES)
      } catch {
        if (!cancelled) {
          setAllExercises(LOCAL_EXERCISES)
          setError(null) // Silently fall back — local data is still usable
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Derived filter options ─────────────────────────────────────────────────

  const muscleGroups = useMemo(() => {
    const set = new Set(allExercises.map(e => e.muscle_group).filter(Boolean))
    return [...set].sort()
  }, [allExercises])

  const equipmentList = useMemo(() => {
    const set = new Set(allExercises.map(e => e.equipment).filter(Boolean))
    return [...set].sort()
  }, [allExercises])

  // ── Filtered results ───────────────────────────────────────────────────────

  const filteredExercises = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return allExercises.filter(ex => {
      const matchesQuery = !q || ex.name.toLowerCase().includes(q)
      const matchesMuscle = !muscleGroup || ex.muscle_group === muscleGroup
      const matchesEquip  = !equipment   || ex.equipment    === equipment
      return matchesQuery && matchesMuscle && matchesEquip
    })
  }, [allExercises, searchQuery, muscleGroup, equipment])

  return {
    filteredExercises,
    loading,
    error,
    searchQuery,  setSearchQuery,
    muscleGroup,  setMuscleGroup,
    equipment,    setEquipment,
    muscleGroups,
    equipmentList,
    allExercises,
  }
}
