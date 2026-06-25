import { Outlet } from 'react-router-dom'
import StaffBottomNav from '../components/StaffBottomNav'
import { useStaffPermissions } from '../hooks/useStaffPermissions'

export default function StaffLayout() {
  const staffCtx = useStaffPermissions()

  return (
    <>
      <Outlet context={staffCtx} />
      <StaffBottomNav permissions={staffCtx.permissions} />
    </>
  )
}
