import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext(null)

const lsOnboarding = (uid) => `gv_onboarding_${uid}`
const lsRole       = (uid) => `gv_role_${uid}`

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [role, setRole]                     = useState(null)
  const [onboardingComplete, setOnboardingComplete] = useState(null)
  const [viewMode, setViewMode]                     = useState(null)         // 'member' | null, session-only
  const [memberDataComplete, setMemberDataComplete] = useState(null)         // null=unknown, true/false
  const checkedForUserId = useRef(null)

  const effectiveRole   = viewMode === 'member' ? 'consumer' : role
  const enterMemberMode = () => setViewMode('member')
  const exitMemberMode  = () => setViewMode(null)

  async function checkOnboarding(userId) {
    if (!userId) {
      checkedForUserId.current = null
      setRole(null)
      setOnboardingComplete(null)
      setMemberDataComplete(null)
      setViewMode(null)
      return
    }

    // Skip if we already confirmed this user in this session
    if (checkedForUserId.current === userId) return

    // Fast path: localStorage cache means token-refresh events are instant
    // Trainers skip the fast path — need a fresh DB read to compute memberDataComplete
    const cachedDone = localStorage.getItem(lsOnboarding(userId))
    const cachedRole = localStorage.getItem(lsRole(userId))
    if (cachedDone === 'true' && cachedRole && cachedRole !== 'trainer') {
      checkedForUserId.current = userId
      setRole(cachedRole)
      setOnboardingComplete(true)
      return
    }

    try {
      const { data } = await Promise.race([
        supabase
          .from('users')
          .select('id, goal, training_days, role, gym_id')
          .eq('id', userId)
          .maybeSingle(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
      ])

      const userRole = data?.role ?? null
      setRole(userRole)
      setMemberDataComplete(!!(data?.goal && data?.training_days))

      let done = false
      if (!userRole) {
        done = false
      } else if (userRole === 'consumer') {
        done = !!(data?.goal && data?.training_days)
      } else if (userRole === 'trainer') {
        try {
          const { data: tp } = await supabase
            .from('trainer_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()
          done = !!tp
        } catch {
          done = true
        }
      } else if (userRole === 'gym_owner') {
        done = !!(data?.gym_id)
      } else if (userRole === 'gym_member') {
        done = !!(data?.goal && data?.training_days)
      } else if (userRole === 'staff') {
        try {
          const { data: staffRow } = await supabase
            .from('gym_staff')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle()
          done = !!staffRow
        } catch {
          done = false
        }
      }

      if (done) {
        checkedForUserId.current = userId
        localStorage.setItem(lsOnboarding(userId), 'true')
        localStorage.setItem(lsRole(userId), userRole)
      }
      setOnboardingComplete(done)
    } catch {
      // Timeout or network error — assume done to prevent redirect loop
      checkedForUserId.current = userId
      setOnboardingComplete(true)
      setMemberDataComplete(true) // fail-open: don't gate member mode on network errors
    }
  }

  useEffect(() => {
    // One-time migration: ff_ localStorage keys → gv_
    try {
      if (!localStorage.getItem('gv_keys_migrated')) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('ff_')) {
            const value = localStorage.getItem(key)
            localStorage.setItem(key.replace(/^ff_/, 'gv_'), value)
            localStorage.removeItem(key)
          }
        })
        localStorage.setItem('gv_keys_migrated', 'true')
      }
    } catch {}

    // ONLY use onAuthStateChange — never call getSession() here.
    // Supabase JS v2 fires onAuthStateChange immediately on mount with the
    // current session (INITIAL_SESSION event), so a separate getSession()
    // call is redundant AND causes a browser lock conflict.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null
        setUser(u)
        // A clicked password-reset link lands here as PASSWORD_RECOVERY: Supabase
        // sets a real (temporary-purpose) session so ResetPassword.jsx can call
        // updateUser({ password }), but this is not a normal sign-in. Skip the
        // role/onboarding lookup (and its localStorage caching) for it — that
        // page owns its own navigation once the password is actually set;
        // running checkOnboarding here would do a needless DB read mid-recovery
        // for no one that reads its result.
        if (event === 'PASSWORD_RECOVERY') {
          setLoading(false)
          return
        }
        // Do not await — Supabase holds the auth lock while subscriber callbacks
        // run; any await blocks token refresh and visibility-change recovery.
        void checkOnboarding(u?.id ?? null).finally(() => setLoading(false))
      }
    )
    return () => { subscription.unsubscribe() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password, options = {}) => supabase.auth.signUp({ email, password, options })

  async function signOut() {
    const uid = user?.id
    checkedForUserId.current = null
    setRole(null)
    setOnboardingComplete(null)
    if (uid) {
      localStorage.removeItem(lsOnboarding(uid))
      localStorage.removeItem(lsRole(uid))
      localStorage.removeItem(`gv_active_gym_${uid}`)
    }
    // One-time cleanup of the legacy non-namespaced gym-id cache (superseded
    // by gv_active_gym_${uid} in ActiveGymContext) — was never cleared here before.
    localStorage.removeItem('gymId')
    await supabase.auth.signOut()
  }

  // Call this instead of setOnboardingComplete(true) after completing onboarding.
  // Stamps checkedForUserId AND localStorage so token-refresh events skip re-check.
  function markOnboardingComplete() {
    const uid = user?.id ?? null
    checkedForUserId.current = uid
    setOnboardingComplete(true)
    if (uid && role) {
      localStorage.setItem(lsOnboarding(uid), 'true')
      localStorage.setItem(lsRole(uid), role)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, role, setRole, onboardingComplete, setOnboardingComplete,
      markOnboardingComplete, signIn, signUp, signOut,
      viewMode, effectiveRole, memberDataComplete, setMemberDataComplete, enterMemberMode, exitMemberMode,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
