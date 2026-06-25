import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../utils/supabase'

const THEMES = [
  { id: 'light',  label: 'Light' },
  { id: 'dark',   label: 'Dark' },
  { id: 'system', label: 'System' },
]

function Row({ label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  )
}

export default function StaffSettings() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { gymName, roleLabel } = useStaffPermissions()
  const { theme, setThemeMode } = useTheme()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setEmail(authUser?.email || '')
      setFullName(authUser?.user_metadata?.full_name || '')
    }
    load()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 100,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--bg-card)',
        borderBottom: '0.5px solid var(--border)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <ChevronLeft size={24} color="var(--text-primary)" />
        </button>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Settings</span>
      </div>

      <div style={{ padding: '20px 20px' }}>
        {/* Profile */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Profile
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: '0 16px' }}>
            <Row label="Name"  value={fullName} />
            <Row label="Email" value={email} />
            <Row label="Role"  value={roleLabel} />
            <div style={{ padding: '14px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gym</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{gymName || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Appearance
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {THEMES.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setThemeMode(t.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: theme === t.id ? 'var(--bg-hover)' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderBottom: i < THEMES.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{t.label}</span>
                {theme === t.id && <Check size={16} color="var(--text-cta)" />}
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            backgroundColor: 'var(--error-bg)',
            border: '1px solid var(--error)',
            color: 'var(--error)', fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
