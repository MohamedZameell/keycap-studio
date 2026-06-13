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
import { useStore } from '../store'
import { syncOnSignIn } from '../lib/colorwaySync'

// Module-level so every useAuth consumer shares a single sync per signed-in
// user — otherwise each mounted consumer would re-run the merge on sign-in.
let _cwSyncedUserId = null
let _cwSyncInFlight = false
async function syncColorways(userId) {
  if (!userId || _cwSyncInFlight || _cwSyncedUserId === userId) return
  _cwSyncInFlight = true
  try {
    const { merged, synced } = await syncOnSignIn(useStore.getState().customColorways)
    if (synced) {
      useStore.getState().setCustomColorways(merged)
      _cwSyncedUserId = userId
    }
  } catch {
    // localStorage already holds every colorway — a sync miss is non-fatal.
  } finally {
    _cwSyncInFlight = false
  }
}

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
        syncColorways(session.user.id) // pull/merge cloud colorways on a signed-in cold start
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const p = await getProfile(session.user.id)
        setProfile(p)
        if (event === 'SIGNED_IN') syncColorways(session.user.id) // fresh sign-in → merge cloud colorways
      } else {
        setProfile(null)
        _cwSyncedUserId = null // allow a re-sync on the next sign-in
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
