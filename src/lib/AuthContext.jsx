import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [brand, setBrand]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadBrand(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadBrand(session.user.id)
      else { setBrand(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadBrand(userId) {
    const { data } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setBrand(data ?? null)
    setLoading(false)
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    return { data, error }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  // Google OAuth — opens popup or redirect
  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setBrand(null)
  }

  async function refreshBrand() {
    if (user) await loadBrand(user.id)
  }

  const trialDaysLeft = brand?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(brand.trial_ends_at) - Date.now()) / 86400000))
    : 0

  return (
    <AuthCtx.Provider value={{
      user, brand, loading, trialDaysLeft,
      signUp, signIn, signInWithGoogle, signOut, refreshBrand
    }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
