import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resolveAuthenticatedRedirect } from '../utils/authFlow'
import { supabase } from '../utils/supabase'

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

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function finishOAuth() {
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

        const user = data?.session?.user
        if (!user) throw new Error('No authenticated session was found. Please try signing in again.')

        const result = await resolveAuthenticatedRedirect(user)
        if (!cancelled) navigate(result.path, { replace: true })
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Authentication failed. Please try again.')
      }
    }

    finishOAuth()
    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 h-10 w-10 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--text-primary)] animate-spin" />
        <h1 className="text-[22px] font-bold text-[var(--text-primary)] mb-2">
          Finishing sign in
        </h1>
        <p className="text-[14px] text-[var(--text-tertiary)] leading-6">
          We are setting up your Gymvyn session.
        </p>

        {error && (
          <div className="mt-6 bg-[var(--error-bg)] border border-[var(--error)]/20 rounded-xl px-4 py-3 text-left">
            <p className="text-[13px] text-[var(--error)]">{error}</p>
            <Link
              to="/login"
              className="mt-3 inline-flex text-[13px] font-semibold text-[var(--text-primary)]"
            >
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
