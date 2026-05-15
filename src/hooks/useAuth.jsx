import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(null)
  const checkedRef = useRef(false)

  async function checkOnboarding(userId) {
    if (!userId) {
      checkedRef.current = false
      setOnboardingComplete(null)
      return
    }
    // Already confirmed this session — do NOT re-check
    if (checkedRef.current) return

    try {
      const { data } = await Promise.race([
        supabase
          .from('users')
          .select('id, goal, training_days')
          .eq('id', userId)
          .maybeSingle(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
      ])
      const done = !!(data?.goal && data?.training_days)
      if (done) checkedRef.current = true
      setOnboardingComplete(done)
    } catch {
      // Timeout or network error — assume done to prevent redirect loop
      checkedRef.current = true
      setOnboardingComplete(true)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return
        const u = session?.user ?? null
        setUser(u)
        await checkOnboarding(u?.id ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        // Only call checkOnboarding if user changed (login/logout)
        // NOT on token refresh (same user, same id)
        if (u?.id !== checkedRef.currentUserId) {
          checkedRef.currentUserId = u?.id ?? null
          await checkOnboarding(u?.id ?? null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp  = (email, password) => supabase.auth.signUp({ email, password })

  async function signOut() {
    checkedRef.current = false
    checkedRef.currentUserId = null
    setOnboardingComplete(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, loading, onboardingComplete, setOnboardingComplete,
      signIn, signUp, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
