import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // null = not yet checked, true = done, false = not done
  const [onboardingComplete, setOnboardingComplete] = useState(null)

  async function checkOnboarding(userId) {
    if (!userId) {
      setOnboardingComplete(null)
      return
    }
    try {
      const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout')), 5000)
      )
      const query = supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      const { data } = await Promise.race([query, timeout])
      setOnboardingComplete(!!data)
    } catch {
      // Table missing, network error, or timeout — treat as not done
      setOnboardingComplete(false)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      await checkOnboarding(u?.id ?? null)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password })

  async function signOut() {
    setOnboardingComplete(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, onboardingComplete, setOnboardingComplete, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
