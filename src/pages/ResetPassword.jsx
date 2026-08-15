import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resolveAuthenticatedRedirect } from '../utils/authFlow'
import { supabase } from '../utils/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────
// Same URL-error and code-exchange approach as AuthCallback.jsx — Supabase
// recovery links use the same shapes (a PKCE `?code=` that must be manually
// exchanged, or an older-style `#access_token=...&type=recovery` hash that
// the client's detectSessionInUrl already processes on its own by the time
// this effect runs).

function getUrlAuthError() {
  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return (
    params.get('error_description') ||
    params.get('error') ||
    hash.get('error_description') ||
    hash.get('error') ||
    ''
  )
}

function friendlyError(msg) {
  if (/should be at least/i.test(msg)) return 'Password must be at least 8 characters.'
  if (/same password|different from the old/i.test(msg)) return 'New password must be different from your current password.'
  return msg || 'Something went wrong. Please try again.'
}

function getStrength(p) {
  let s = 0
  if (p.length >= 8)          s++
  if (/[A-Z]/.test(p))        s++
  if (/[0-9]/.test(p))        s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
}

const strengthMeta = [
  { label: 'Too weak', color: 'var(--text-tertiary)' },
  { label: 'Weak',   color: 'var(--error)' },
  { label: 'Fair',   color: 'var(--warning)' },
  { label: 'Good',   color: 'var(--text-cta)' },
  { label: 'Strong', color: 'var(--success)' },
]

// ── Shared icons (duplicated from Login.jsx/Signup.jsx — this codebase
// keeps small per-page icon sets rather than a shared icon module) ──────────

const LockIcon = ({ color = 'var(--text-tertiary)' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const EyeIcon = ({ open = true, color = 'var(--text-tertiary)' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
)

function InputField({ icon, type = 'text', placeholder, value, onChange, rightElement }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className={`flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl px-4 h-14 transition-all duration-150 ${
      active ? 'border border-[var(--text-primary)]' : 'border border-[var(--border-strong)]'
    }`}>
      <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 text-[15px] text-[var(--text-primary)] bg-transparent focus:outline-none placeholder-[var(--text-tertiary)]"
        style={{ background: 'transparent' }}
      />
      {rightElement}
    </div>
  )
}

const CTAButton = ({ label, onClick, disabled, loading }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full h-[54px] rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98] border ${
      disabled
        ? 'bg-[var(--bg-pill)] border-[var(--border)] cursor-not-allowed'
        : 'bg-[var(--cta-bg)] border-[var(--cta-border)]'
    }`}
  >
    <span className={`text-[16px] font-bold ${disabled ? 'text-[var(--text-tertiary)]' : 'text-[var(--cta-text)]'}`}>
      {loading ? 'Please wait...' : label}
    </span>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${disabled ? 'bg-[var(--border)]' : 'bg-[var(--bg-pill)]'}`}>
      <span className={`text-sm ${disabled ? 'text-[var(--text-tertiary)]' : 'text-[var(--cta-text)]'}`}>→</span>
    </div>
  </button>
)

// ── Main ──────────────────────────────────────────────────────────────────────

// Reachable only via the link Supabase's password-reset email sends
// (redirectTo is PASSWORD_RESET_PATH, see authFlowCore.js). Deliberately not
// wrapped in PublicRoute/ProtectedRoute — same reasoning as AuthCallback.jsx:
// the page itself owns exchanging the link's code for a session, so it can't
// depend on a route guard that expects one to already exist.
export default function ResetPassword() {
  const navigate = useNavigate()

  const [verifying, setVerifying] = useState(true)
  const [linkError, setLinkError] = useState('')

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [submitError,     setSubmitError]     = useState('')
  const [done,            setDone]            = useState(false)

  // Exchange the link's code for a (recovery-purpose) session.
  useEffect(() => {
    let cancelled = false

    async function verifyLink() {
      try {
        const urlError = getUrlAuthError()
        if (urlError) throw new Error(urlError)

        const params = new URLSearchParams(window.location.search)
        if (params.get('code')) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (exchangeError) throw exchangeError
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!data?.session) throw new Error('This reset link is invalid or has expired. Request a new one from the sign-in screen.')

        if (!cancelled) setVerifying(false)
      } catch (err) {
        if (!cancelled) {
          setLinkError(err?.message || 'This reset link is invalid or has expired.')
          setVerifying(false)
        }
      }
    }

    verifyLink()
    return () => { cancelled = true }
  }, [])

  const canSubmit = password.length >= 8 && password === confirmPassword && !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitError('')

    if (password.length < 8) { setSubmitError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setSubmitError('Passwords do not match.'); return }

    setSubmitting(true)
    const { data, error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) { setSubmitError(friendlyError(error.message)); return }

    setDone(true)
    // The recovery session is now a normal authenticated session — route the
    // same way a fresh sign-in / OAuth callback would, instead of forcing a
    // second manual login right after they just proved account ownership.
    const user = data?.user
    if (user) {
      try {
        const result = await resolveAuthenticatedRedirect(user)
        setTimeout(() => navigate(result.path, { replace: true }), 1200)
      } catch {
        setTimeout(() => navigate('/login', { replace: true }), 1200)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      <div className="flex-[0_0_auto] px-7 pt-14 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[var(--text-primary)] rounded-[10px] flex items-center justify-center shrink-0">
            <span className="text-[17px] font-black text-[var(--bg-primary)] tracking-tight">GV</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-bold text-[var(--text-primary)]">Gymvyn</span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] mb-0.5">AI</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-[var(--bg-card)] rounded-t-[24px] px-6 pt-7 pb-10 border-t border-[var(--border)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-5">Set New Password</p>

        {verifying ? (
          <div className="flex flex-col items-center pt-10">
            <div className="h-9 w-9 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--text-primary)] animate-spin mb-4" />
            <p className="text-[14px] text-[var(--text-tertiary)]">Verifying your reset link…</p>
          </div>
        ) : linkError ? (
          <div className="bg-[var(--error-bg)] border border-[var(--error)]/20 rounded-xl px-4 py-3">
            <p className="text-[13px] text-[var(--error)] leading-relaxed">{linkError}</p>
            <Link to="/login" className="mt-3 inline-flex text-[13px] font-semibold text-[var(--text-primary)]">
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="bg-[var(--success-bg)] border border-[var(--success)]/20 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-[var(--success)] mb-1">Password updated</p>
            <p className="text-[13px] text-[var(--success)]/80">Taking you into Gymvyn…</p>
          </div>
        ) : (
          <>
            {submitError && (
              <div className="bg-[var(--error-bg)] border border-[var(--error)]/20 rounded-xl px-4 py-3 mb-4">
                <p className="text-[13px] text-[var(--error)]">{submitError}</p>
              </div>
            )}

            <div className="space-y-2.5">
              <div>
                <InputField
                  icon={<LockIcon />}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="shrink-0 p-1">
                      <EyeIcon open={showPassword} color={showPassword ? 'var(--text-primary)' : 'var(--text-tertiary)'} />
                    </button>
                  }
                />
                {password.length > 0 && (() => {
                  const s = getStrength(password)
                  const meta = strengthMeta[s]
                  return (
                    <div className="flex items-center gap-2 mt-2 px-1">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="flex-1 h-1 rounded-full transition-all duration-300"
                            style={{ backgroundColor: i <= s ? meta.color : 'var(--border)' }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                  )
                })()}
              </div>

              <InputField
                icon={<LockIcon />}
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-[12px] text-[var(--error)] px-1">Passwords do not match.</p>
              )}
            </div>

            <div className="mt-5">
              <CTAButton label="Update Password" onClick={handleSubmit} disabled={!canSubmit} loading={submitting} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
