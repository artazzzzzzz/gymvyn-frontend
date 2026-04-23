import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return user ? <Navigate to="/home" replace /> : children
}
