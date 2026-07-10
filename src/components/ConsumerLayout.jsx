import { useState, useEffect, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import MoreSheet from './MoreSheet'
import WorkoutMiniBar from './WorkoutMiniBar'
import { JoinGymSheet } from './JoinGymSheet'
import { JoinTrainerSheet } from './JoinTrainerSheet'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getMyGym } from '../utils/api'
import { CartProvider } from '../contexts/CartContext'
import { useWorkoutSessionContext } from '../contexts/WorkoutSessionContext'

export default function ConsumerLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const { isActive } = useWorkoutSessionContext()
  const isLiveWorkout = location.pathname === '/workout/live'
  const [moreOpen, setMoreOpen] = useState(false)
  const [hasGym, setHasGym] = useState(false)
  const [gymId, setGymId] = useState(null)
  const [hasTrainer, setHasTrainer] = useState(false)
  const [showJoinGym, setShowJoinGym] = useState(false)
  const [showJoinTrainer, setShowJoinTrainer] = useState(false)

  const fetchLinks = useCallback(async () => {
    if (!user) return
    // gym_memberships (via getMyGym) is the source of truth for gym linkage —
    // users.gym_id is a denormalized field that can go stale, so it must not
    // be trusted directly here.
    const [gym, { data: t }] = await Promise.all([
      getMyGym(user.id).catch(() => null),
      supabase.from('trainer_clients').select('trainer_id').eq('client_id', user.id).eq('status', 'active').maybeSingle(),
    ])
    setHasGym(!!gym?.linked)
    setGymId(gym?.gym?.id || null)
    setHasTrainer(!!t?.trainer_id)
  }, [user])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  return (
    <>
      <CartProvider gymId={gymId}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet context={{ hasGym, hasTrainer, gymId, setShowJoinGym, setShowJoinTrainer, refetchLinks: fetchLinks }} />
      </div>
      {isActive && !isLiveWorkout && <WorkoutMiniBar />}
      <BottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        hasGym={hasGym}
        hasTrainer={hasTrainer}
        onOpenJoinGym={() => { setMoreOpen(false); setTimeout(() => setShowJoinGym(true), 250) }}
        onOpenJoinTrainer={() => { setMoreOpen(false); setTimeout(() => setShowJoinTrainer(true), 250) }}
      />
      <JoinGymSheet
        open={showJoinGym}
        onClose={() => setShowJoinGym(false)}
        onSuccess={() => { setShowJoinGym(false); fetchLinks() }}
      />
      <JoinTrainerSheet
        open={showJoinTrainer}
        onClose={() => setShowJoinTrainer(false)}
        onSuccess={() => { setShowJoinTrainer(false); fetchLinks() }}
      />
      </CartProvider>
    </>
  )
}
