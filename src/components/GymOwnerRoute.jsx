import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOwnerGymStatus } from '../hooks/useOwnerGymId'
import { ActiveGymProvider } from '../contexts/ActiveGymContext'
import { AppLoader } from './loading/Loading'
import OwnerAssistant from './assistant/OwnerAssistant'
import GymSwitcher from './GymSwitcher'

const ASSISTANT_ENABLED = import.meta.env.VITE_AI_ASSISTANT_ENABLED === 'true'

function GymDeactivatedScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Gym Account Deactivated
      </h1>
      <p style={{
        color: 'var(--text-secondary)',
        maxWidth: 360,
        lineHeight: 1.6,
        marginBottom: '2rem',
      }}>
        Your gym account is currently inactive. Your historical data is preserved.
        Contact support to reactivate your account.
      </p>
      <a
        href="mailto:support@gymvyn.com"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          backgroundColor: 'var(--accent)',
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: '1rem',
        }}
      >
        Contact Support
      </a>
      <a
        href="/home"
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          textDecoration: 'underline',
        }}
      >
        Go to Home
      </a>
    </div>
  )
}

// Gates on gym status + renders the switcher/children/assistant — split out
// from GymOwnerRoute so it runs inside ActiveGymProvider (useOwnerGymStatus
// now reads from that context, so it can't be called above the provider).
function GymOwnerRouteInner({ children }) {
  const { gymResolved, gymDeactivated } = useOwnerGymStatus()

  // Wait for gym status check before rendering gym management pages
  if (!gymResolved) return <AppLoader label="Checking gym status" />

  if (gymDeactivated) return <GymDeactivatedScreen />

  return (
    <>
      <GymSwitcher />
      {children}
      {ASSISTANT_ENABLED && <OwnerAssistant />}
    </>
  )
}

export default function GymOwnerRoute({ children }) {
  const { user, loading, role, onboardingComplete } = useAuth()

  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />

  // role/onboardingComplete still resolving from checkOnboarding
  if (role === null || onboardingComplete === null) return <AppLoader label="Preparing your gym" />

  if (role !== 'gym_owner') {
    if (role === 'trainer') return <Navigate to="/trainer/dashboard" replace />
    if (role === 'staff') return <Navigate to="/staff/dashboard" replace />
    return <Navigate to="/home" replace />
  }

  if (!onboardingComplete) return <Navigate to="/gym-onboarding" replace />

  return (
    <ActiveGymProvider>
      <GymOwnerRouteInner>{children}</GymOwnerRouteInner>
    </ActiveGymProvider>
  )
}
