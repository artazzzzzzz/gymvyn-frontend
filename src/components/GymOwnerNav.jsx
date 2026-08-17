import { useState } from 'react'
import GymBottomNav from './GymBottomNav'
import MoreSheet from './MoreSheet'

/**
 * Thin wrapper used by older owner pages (GymAnnouncements, GymImport,
 * GymComingSoon) that haven't been migrated to inline GymBottomNav yet.
 * Renders the same 5-tab nav every other gym-owner page uses, plus the
 * standard MoreSheet — no more 8-item overflow on narrow screens.
 */
export default function GymOwnerNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  return (
    <>
      <GymBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
