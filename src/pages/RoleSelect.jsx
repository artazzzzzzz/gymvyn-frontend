import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

const ROLES = [
  {
    key: 'consumer',
    emoji: '🏋️',
    title: "I'm here to train",
    sub: 'Get personalized workouts, track progress, and connect with a trainer.',
    next: '/onboarding',
  },
  {
    key: 'trainer',
    emoji: '🎯',
    title: "I'm a Trainer / Coach",
    sub: 'Build your client base, manage plans, and grow your fitness business.',
    next: '/become-trainer',
  },
  {
    key: 'gym_owner',
    emoji: '🏢',
    title: 'I own a Gym',
    sub: 'Manage members, trainers, schedules, and your gym operations.',
    next: '/gym-onboarding',
  },
  {
    key: 'staff',
    emoji: '🪪',
    title: 'Staff',
    sub: 'Front desk & gym management.',
    next: '/stagv-onboarding',
  },
]

export default function RoleSelect() {
  const { user, role: existingRole, setRole, setOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(null) // key of role being saved

  useEffect(() => {
    if (!existingRole) return
    const match = ROLES.find(r => r.key === existingRole)
    if (match) navigate(match.next, { replace: true })
  }, [existingRole, navigate])

  async function handleSelect(roleOption) {
    if (!user?.id || saving) return
    setSaving(roleOption.key)
    try {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          role: roleOption.key,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        }, { onConflict: 'id' })
      if (error) throw error
      // Update auth context immediately so ProtectedRoute doesn't redirect back here
      setRole(roleOption.key)
      setOnboardingComplete(false)
      navigate(roleOption.next)
    } catch (err) {
      console.error('Role select failed:', err)
      setSaving(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div style={{
          width: 44, height: 44, backgroundColor: "var(--bg-card)",
          borderRadius: 10, display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 24,
          border: '1px solid var(--border)',
        }}>
          <span style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 900, letterSpacing: '-0.5px' }}>GV</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: '0 0 8px', lineHeight: 1.15 }}>
          What brings you here?
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5 }}>
          Pick your role — you can only choose once.
        </p>
      </div>

      {/* Role cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {ROLES.map(r => {
          const isSaving = saving === r.key
          return (
            <button
              key={r.key}
              onClick={() => handleSelect(r)}
              disabled={!!saving}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                backgroundColor: 'var(--bg-card)',
                border: isSaving ? '1.5px solid var(--text-cta)' : '1px solid var(--border)',
                borderRadius: 12,
                padding: '18px 16px',
                cursor: saving ? 'default' : 'pointer',
                opacity: saving && !isSaving ? 0.45 : 1,
                textAlign: 'left',
                width: '100%',
                transition: 'border 0.15s, opacity 0.15s',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {isSaving ? (
                  <div style={{
                    width: 20, height: 20, border: '2px solid var(--text-primary)',
                    borderTopColor: 'transparent', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                ) : r.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                  {r.sub}
                </div>
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 18, paddingTop: 2 }}>›</div>
            </button>
          )
        })}
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-disabled)', padding: '24px 0 40px' }}>
        Your role determines which features you see.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
