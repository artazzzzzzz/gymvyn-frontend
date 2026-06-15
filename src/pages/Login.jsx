import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

function friendlyError(msg) {
  if (/invalid login credentials/i.test(msg)) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(msg))        return 'Please confirm your email before signing in.'
  if (/too many requests/i.test(msg))           return 'Too many attempts. Please wait a moment and try again.'
  return msg
}

// ── Shared icons ──────────────────────────────────────────────────────────────

const MailIcon = ({ color = '#CCC' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)

const LockIcon = ({ color = '#CCC' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const EyeIcon = ({ open = true, color = '#CCC' }) => (
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

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.28.05-2.28-1.32-3.11-2.54C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

// ── Shared components ─────────────────────────────────────────────────────────

function InputField({ icon, type = 'text', placeholder, value, onChange, rightElement }) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0
  return (
    <div className={`flex items-center gap-3 bg-white rounded-2xl px-4 h-14 transition-all duration-150 ${
      active ? 'border border-[#111]' : 'border border-black/[0.07]'
    }`}>
      <span className="shrink-0 transition-colors" style={{ color: active ? '#111' : '#CCC' }}>
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex-1 text-[15px] text-[#111] bg-transparent focus:outline-none placeholder-[#BBB]"
      />
      {rightElement}
    </div>
  )
}

const SocialButtons = ({ onApple, onGoogle }) => (
  <div className="grid grid-cols-2 gap-2 mt-3">
    <button
      onClick={onApple}
      className="h-12 bg-[#111] rounded-xl flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
    >
      <AppleIcon />
      <span className="text-[14px] font-semibold text-white">Apple</span>
    </button>
    <button
      onClick={onGoogle}
      className="h-12 bg-white border border-black/[0.08] rounded-xl flex items-center justify-center gap-2 active:bg-[#F7F7F5] transition-colors"
    >
      <GoogleIcon />
      <span className="text-[14px] font-semibold text-[#111]">Google</span>
    </button>
  </div>
)

const CTAButton = ({ label, onClick, disabled, loading }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full h-[54px] rounded-2xl flex items-center justify-between px-5 transition-all active:scale-[0.98] ${
      disabled ? 'bg-[#2A2A2A] cursor-not-allowed' : 'bg-[#0D0D0D]'
    }`}
  >
    <span className="text-[16px] font-bold text-white">
      {loading ? 'Please wait...' : label}
    </span>
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
      <span className="text-white text-sm">→</span>
    </div>
  </button>
)

const OrDivider = () => (
  <div className="flex items-center gap-3 mt-5">
    <div className="flex-1 h-px bg-black/[0.06]" />
    <span className="text-[12px] text-[#BBB]">or continue with</span>
    <div className="flex-1 h-px bg-black/[0.06]" />
  </div>
)

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Login() {
  const { signIn } = useAuth()

  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState('')

  const canSubmit = email.trim() && password.length >= 6 && !isLoading

  async function handleLogin() {
    if (!canSubmit) return
    setError('')
    setIsLoading(true)
    const { error: authError } = await signIn(email, password)
    setIsLoading(false)
    // No navigate() — PublicRoute detects the new session and routes
    // to /home or /onboarding based on whether the user is in the users table
    if (authError) setError(friendlyError(authError.message))
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function handleApple() {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D] overflow-hidden">

      {/* ── BLACK ZONE (top ~55%) ── */}
      <div className="flex-[0_0_auto] px-7 pt-14 pb-8 bg-[#0D0D0D]">

        {/* Brand lockup */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white rounded-[10px] flex items-center justify-center shrink-0">
            <span className="text-[17px] font-black text-[#0D0D0D] tracking-tight">FF</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[20px] font-bold text-white">FitForge</span>
            <span className="text-[11px] font-medium text-white/40 mb-0.5">AI</span>
          </div>
        </div>

        {/* Hero headline */}
        <div className="mt-9 leading-[1.0]">
          <p className="text-[52px] font-black text-white tracking-[-2px]">Train</p>
          <p className="text-[52px] font-black text-white tracking-[-2px]">smarter.</p>
          <p
            className="text-[52px] font-black tracking-[-2px]"
            style={{ color: 'transparent', WebkitTextStroke: '1.5px white' }}
          >
            Not harder.
          </p>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-2 mt-7">
          <div className="flex">
            {[
              { bg: '#EAF3DE', c: '#3B6D11', i: 'AK' },
              { bg: '#E6F1FB', c: '#0C447C', i: 'SR' },
              { bg: '#FAEEDA', c: '#854F0B', i: 'RV' },
            ].map((a, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full border-[2px] border-[#0D0D0D] flex items-center justify-center text-[8px] font-bold -ml-1.5 first:ml-0"
                style={{ backgroundColor: a.bg, color: a.c, zIndex: 3 - idx }}
              >
                {a.i}
              </div>
            ))}
          </div>
          <p className="text-[12px] text-white/40 ml-1">Join 12,000+ members</p>
        </div>
      </div>

      {/* ── WHITE ZONE (bottom) ── */}
      <div className="flex-1 bg-[#F7F7F5] rounded-t-[24px] px-6 pt-7 pb-10 border-t border-white/[0.05]">

        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#999] mb-5">Sign In</p>

        {/* Error */}
        {error && (
          <div className="bg-[#FCEBEB] border border-[#A32D2D]/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-[13px] text-[#A32D2D]">{error}</p>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-2.5">
          <InputField
            icon={<MailIcon />}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <InputField
            icon={<LockIcon />}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="shrink-0 p-1"
              >
                <EyeIcon open={showPassword} color={showPassword ? '#111' : '#CCC'} />
              </button>
            }
          />
        </div>

        {/* Forgot */}
        <div className="flex justify-end mt-2">
          <button className="text-[12px] font-medium text-[#185FA5]">Forgot password?</button>
        </div>

        {/* CTA */}
        <div className="mt-5">
          <CTAButton
            label="Sign in"
            onClick={handleLogin}
            disabled={!canSubmit}
            loading={isLoading}
          />
        </div>

        {/* Social */}
        <OrDivider />
        <SocialButtons onApple={handleApple} onGoogle={handleGoogle} />

        {/* Sign up link */}
        <p className="text-center mt-6 text-[13px] text-[#999]">
          New here?{' '}
          <Link to="/signup" className="font-bold text-[#111]">Create account →</Link>
        </p>

        {/* Legal */}
        <p className="text-center text-[11px] text-[#BBB] mt-5 leading-relaxed">
          By continuing you agree to our{' '}
          <button className="text-[#185FA5]">Terms</button>
          {' '}and{' '}
          <button className="text-[#185FA5]">Privacy Policy</button>
        </p>
      </div>

    </div>
  )
}
