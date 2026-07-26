import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function ScreenWelcomeHome() {
  const { user, markOnboardingComplete, setMemberDataComplete } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'

  useEffect(() => {
    markOnboardingComplete()
    if (location.state?.completionKey === 'member' && location.state?.returnTo) {
      setMemberDataComplete(true) // data was just saved by ScreenProcessing; unblock ProtectedRoute
      navigate(location.state.returnTo, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1, justifyContent: 'center',
      paddingBottom: 48,
    }}>
      {/* Celebration */}
      <div style={{ textAlign: 'center', paddingBottom: 40 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-cta)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: 30, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 12px',
          letterSpacing: '-0.5px',
        }}>
          Welcome to Gymvyn,<br />{firstName}.
        </h1>
        <p style={{
          fontSize: 16, color: 'var(--text-secondary)',
          margin: 0, lineHeight: 1.55,
        }}>
          Your plan is set. Your first action:<br />log a workout.
        </p>
      </div>

      {/* Stats summary */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: 'var(--success-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Your profile is ready
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Goal, plan, stats and priorities — all saved.
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => navigate('/workout')}
        style={{
          width: '100%',
          padding: '17px 24px',
          backgroundColor: 'var(--text-cta)',
          color: 'var(--bg-primary)',
          border: 'none',
          borderRadius: 14,
          fontSize: 17,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '-0.2px',
          marginBottom: 12,
        }}
      >
        Log my first workout
      </button>

      {/* Secondary */}
      <button
        onClick={() => navigate('/home')}
        style={{
          width: '100%',
          padding: '15px 24px',
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Explore first
      </button>
    </div>
  )
}
