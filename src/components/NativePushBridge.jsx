import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../hooks/useAuth'
import { registerDeviceToken, unregisterDeviceToken } from '../utils/api'

const PLATFORM = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

// Where a chat push should deep-link to depends on the CURRENT user's role
// (whoever is opening the app), not the sender — each role has its own chat
// screen and only the trainer route currently takes a conversation id.
function chatRouteFor(role, conversationId) {
  if (role === 'trainer') return `/trainer/chat/${conversationId}`
  if (role === 'gym_owner') return '/gym/chat'
  if (role === 'staff') return '/staff/chat'
  return '/chat'
}

// Registers this device for push notifications once a user is logged in,
// unregisters on logout, and deep-links notification taps to the right
// screen. Native only — the web app has no equivalent.
export default function NativePushBridge() {
  const { user, effectiveRole } = useAuth()
  const navigate = useNavigate()
  const tokenRef = useRef(null)
  const registeredForUserId = useRef(null)

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const subs = [
      PushNotifications.addListener('registration', (token) => {
        tokenRef.current = token.value
        if (user?.id) {
          registerDeviceToken(PLATFORM, token.value)
            .then(() => { registeredForUserId.current = user.id })
            .catch(err => console.error('[NativePushBridge] token registration failed:', err.message))
        }
      }),
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[NativePushBridge] push registration error:', err)
      }),
      // Foreground: the user is already looking at the app — the native
      // system banner is suppressed (capacitor.config.ts
      // presentationOptions: []) and callers instead react to this event to
      // update in-app state immediately (e.g. an open chat thread).
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        window.dispatchEvent(new CustomEvent('gv:push-received', { detail: notification }))
      }),
      // Background/closed, tapped: the OS already showed the system
      // notification: this fires once the user taps it, so deep-link them
      // to the relevant screen.
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification?.data || {}
        if (data.type === 'chat_message') {
          navigate(chatRouteFor(effectiveRole, data.conversationId))
        } else if (data.type === 'class_booking_confirmed' || data.type === 'class_booking_promoted') {
          navigate('/classes')
        }
      }),
    ]

    return () => { subs.forEach(s => s.remove()) }
  }, [navigate, user?.id, effectiveRole])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    if (!user?.id) {
      // Logged out — unregister the token this device last registered so
      // it stops receiving pushes meant for the account that just signed
      // out. Best-effort: if it fails, the backend still can't act on a
      // stale token for a user that's no longer authenticated client-side.
      if (tokenRef.current && registeredForUserId.current) {
        unregisterDeviceToken(tokenRef.current).catch(() => {})
        registeredForUserId.current = null
      }
      return
    }

    if (registeredForUserId.current === user.id) return

    PushNotifications.checkPermissions()
      .then(async (status) => {
        let permission = status.receive
        if (permission === 'prompt' || permission === 'prompt-with-rationale') {
          const requested = await PushNotifications.requestPermissions()
          permission = requested.receive
        }
        // Denied — the app must keep working fully without push; chat
        // polling and manual refresh remain the fallback. Nothing else to
        // do here, and we must not re-prompt on every render.
        if (permission !== 'granted') return

        await PushNotifications.register()
      })
      // Best-effort net for genuine async rejections (permission-check errors,
      // an actual FCM token-fetch failure surfaced via registrationError above).
      // It does NOT protect against a missing/broken Firebase config on Android:
      // register() calls FirebaseMessaging.getInstance() synchronously in native
      // code, and if no default FirebaseApp exists that throws before this
      // promise can ever resolve or reject — Capacitor's bridge rethrows it as
      // an uncaught RuntimeException and the process dies, no JS handler runs.
      // That failure mode is guarded natively instead, in MainActivity's
      // ensureFirebaseAppInitialized() (android/app/src/main/java/com/gymvyn/app/MainActivity.java).
      .catch(err => console.error('[NativePushBridge] permission check failed:', err.message))
  }, [user?.id])

  return null
}
