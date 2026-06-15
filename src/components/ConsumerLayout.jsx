import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import MoreSheet from './MoreSheet'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

export default function ConsumerLayout() {
  const { user } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)
  const [hasGym, setHasGym] = useState(false)
  const [hasTrainer, setHasTrainer] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function fetchLinks() {
      const [{ data: u }, { data: t }] = await Promise.all([
        supabase.from('users').select('gym_id').eq('id', user.id).single(),
        supabase.from('trainer_clients').select('trainer_id').eq('client_id', user.id).eq('status', 'active').maybeSingle(),
      ])
      if (cancelled) return
      setHasGym(!!u?.gym_id)
      setHasTrainer(!!t?.trainer_id)
    }
    fetchLinks()
    return () => { cancelled = true }
  }, [user])

  return (
    <>
      <Outlet context={{ hasGym, hasTrainer }} />
      <BottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        hasGym={hasGym}
        hasTrainer={hasTrainer}
      />
    </>
  )
}
