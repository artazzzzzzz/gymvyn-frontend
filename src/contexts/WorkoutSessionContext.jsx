import { createContext, useContext } from 'react'
import { useWorkoutSession } from '../hooks/useWorkoutSession'

const WorkoutSessionContext = createContext(null)

export function WorkoutSessionProvider({ children }) {
  const session = useWorkoutSession()
  return (
    <WorkoutSessionContext.Provider value={session}>
      {children}
    </WorkoutSessionContext.Provider>
  )
}

export const useWorkoutSessionContext = () => useContext(WorkoutSessionContext)
