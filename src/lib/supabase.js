import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ============ AUTH HELPERS ============

export async function signUp(email, password, username) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  })
  return { data, error }
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export async function signOut() {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile(userId) {
  if (!supabase) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function updateProfile(userId, updates) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// ============ GALLERY DESIGNS ============

export async function getGalleryDesigns(options = {}) {
  if (!supabase) return []

  let query = supabase
    .from('designs')
    .select('*, profiles(username)')

  if (options.orderBy === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('likes', { ascending: false })
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) console.error('Error fetching designs:', error)
  return data || []
}

export async function shareDesign(design) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const user = await getUser()

  const { data, error } = await supabase
    .from('designs')
    .insert([{
      user_id: user?.id || null,
      name: design.name,
      color: design.color,
      legend_color: design.legendColor,
      keyboard: design.keyboard,
      theme: design.theme || 'Community',
      font: design.font,
      material: design.material,
      profile: design.profile,
      per_key_designs: design.perKeyDesigns || {},
      images: design.images || [],
      likes: 0
    }])
    .select()
    .single()

  return { data, error }
}

export async function likeDesign(designId) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const user = await getUser()
  if (!user) return { error: { message: 'Must be logged in to like' } }

  // Insert like record
  const { error: likeError } = await supabase
    .from('design_likes')
    .insert([{ user_id: user.id, design_id: designId }])

  if (likeError) {
    if (likeError.code === '23505') { // Already liked
      return { error: { message: 'Already liked' } }
    }
    return { error: likeError }
  }

  // Increment likes count
  const { data, error } = await supabase.rpc('increment_likes', { design_id: designId })

  // Fallback if RPC not set up
  if (error && error.code === '42883') {
    const { data: design } = await supabase
      .from('designs')
      .select('likes')
      .eq('id', designId)
      .single()

    await supabase
      .from('designs')
      .update({ likes: (design?.likes || 0) + 1 })
      .eq('id', designId)
  }

  return { data, error: null }
}

export async function getUserLikes(userId) {
  if (!supabase || !userId) return []

  const { data } = await supabase
    .from('design_likes')
    .select('design_id')
    .eq('user_id', userId)

  return data?.map(l => l.design_id) || []
}

// ============ USER'S PRIVATE DESIGNS ============

export async function getUserDesigns() {
  if (!supabase) return []

  const user = await getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('user_designs')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) console.error('Error fetching user designs:', error)
  return data || []
}

export async function saveUserDesign(design) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const user = await getUser()
  if (!user) return { error: { message: 'Must be logged in to save' } }

  const designData = {
    user_id: user.id,
    name: design.name,
    color: design.color,
    legend_color: design.legendColor,
    keyboard: design.keyboard,
    font: design.font,
    material: design.material,
    profile: design.profile,
    per_key_designs: design.perKeyDesigns || {},
    images: design.images || [],
    is_favorite: design.isFavorite || false,
    updated_at: new Date().toISOString()
  }

  // Update if exists, insert if new
  if (design.id) {
    const { data, error } = await supabase
      .from('user_designs')
      .update(designData)
      .eq('id', design.id)
      .eq('user_id', user.id)
      .select()
      .single()
    return { data, error }
  } else {
    const { data, error } = await supabase
      .from('user_designs')
      .insert([designData])
      .select()
      .single()
    return { data, error }
  }
}

export async function deleteUserDesign(designId) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }

  const user = await getUser()
  if (!user) return { error: { message: 'Must be logged in' } }

  const { error } = await supabase
    .from('user_designs')
    .delete()
    .eq('id', designId)
    .eq('user_id', user.id)

  return { error }
}

// ============ AUTH STATE LISTENER ============

export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }

  return supabase.auth.onAuthStateChange(callback)
}
