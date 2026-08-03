import { useActiveGym } from '../contexts/ActiveGymContext'

// Kept for existing call sites — Phase 2c/2d/2e will migrate them to
// useActiveGym() directly. Now delegates entirely to ActiveGymContext
// instead of its own fetch + localStorage logic.
export function useOwnerGymId() {
  const { activeGymId } = useActiveGym()
  return activeGymId
}

// Used by GymOwnerRoute to detect a deactivated gym. GET /api/gyms/mine
// (which ActiveGymContext fetches) only ever returns active gyms, so "no
// gyms after loading finished" is exactly the deactivated-gym case that
// this used to detect via a dedicated fetch. Returns the same
// { gymId, gymResolved, gymDeactivated } shape as before.
export function useOwnerGymStatus() {
  const { gyms, activeGymId, loading } = useActiveGym()
  const gymResolved = !loading
  const gymDeactivated = !loading && gyms.length === 0

  return { gymId: activeGymId, gymResolved, gymDeactivated }
}
