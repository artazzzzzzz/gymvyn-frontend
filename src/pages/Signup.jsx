import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function friendlyError(msg) {
  if (/user already registered/i.test(msg)) return 'An account with this email already exists.'
  if (/password should be at least/i.test(msg)) return 'Password must be at least 6 characters.'
  if (/unable to validate email/i.test(msg)) return 'Please enter a valid email address.'
  if (/too many requests/i.test(msg)) return 'Too many attempts. Please wait a moment and try again.'
  return msg
}

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const { data, error } = await signUp(email, password)
    setLoading(false)

    if (error) {
      setError(friendlyError(error.message))
    } else if (data.session) {
      // Email confirmation is disabled — signed in immediately
      navigate('/onboarding')
    } else {
      // Email confirmation is enabled — user must verify before signing in
      setSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] flex flex-col items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              FitForge <span className="text-emerald-400">AI</span>
            </span>
          </div>
          <p className="text-zinc-400 text-sm">Your intelligent fitness companion</p>
        </div>

        {/* Card */}
        <div className="bg-[#141416] border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-1">Create your account</h1>
          <p className="text-zinc-400 text-sm mb-7">Start your transformation today</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <p className="font-medium mb-1">Check your email</p>
              <p className="text-emerald-400/70">We sent a confirmation link to <span className="font-medium text-emerald-400">{email}</span>. Click it to activate your account, then sign in.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-zinc-600 text-xs mt-6">
            By creating an account you agree to our{' '}
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</a>
          </p>
        </div>

        <p className="text-center mt-6 text-zinc-500 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
