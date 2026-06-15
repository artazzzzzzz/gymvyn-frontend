import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TrainerBottomNav from './TrainerBottomNav'
import MoreSheet from './MoreSheet'

export default function TrainerLayout() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <Outlet />
      <TrainerBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </>
  )
}
