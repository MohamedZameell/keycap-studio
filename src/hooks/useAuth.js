import { useState, useEffect, useCallback } from 'react'
import {
  supabase,
  isSupabaseConfigured,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  getProfile,
  onAuthStateChange
} from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getProfile(session.user.id).then(setProfile)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await getProfile(session.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email, password) => {
    setLoading(true)
    const result = await supabaseSignIn(email, password)
    setLoading(false)
    return result
  }, [])

  const signUp = useCallback(async (email, password, username) => {
    setLoading(true)
    const result = await supabaseSignUp(email, password, username)
    setLoading(false)
    return result
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    const result = await supabaseSignOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
    return result
  }, [])

  return {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isConfigured: isSupabaseConfigured
  }
}
