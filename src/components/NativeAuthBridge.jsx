import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../utils/supabase'
import { resolveAuthenticatedRedirect } from '../utils/authFlow'
import { NATIVE_OAUTH_CALLBACK_URL, getDeepLinkAuthError, getDeepLinkCode } from '../utils/authFlowCore'

// Native equivalent of AuthCallback.jsx — the OAuth provider returns to
// gymvyn://auth/callback via appUrlOpen instead of a page navigation, so
// there is no /auth/callback page load to run that component's logic on
// native. This mirrors the same error/code parsing and redirect resolution,
// reading a deep-link URL instead of window.location.
export default function NativeAuthBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const subscriptionPromise = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(NATIVE_OAUTH_CALLBACK_URL)) return

      try {
        const authError = getDeepLinkAuthError(url)
        if (authError) throw new Error(authError)

        if (getDeepLinkCode(url)) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(url)
          if (exchangeError) throw exchangeError
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        const user = data?.session?.user
        if (!user) throw new Error('No authenticated session was found. Please try signing in again.')

        const result = await resolveAuthenticatedRedirect(user)
        navigate(result.path, { replace: true })
      } catch (err) {
        console.error('[NativeAuthBridge] OAuth callback failed:', err)
        navigate('/login', { replace: true })
      } finally {
        await Browser.close().catch(() => {})
      }
    })

    return () => { subscriptionPromise.then((sub) => sub.remove()) }
  }, [navigate])

  return null
}
