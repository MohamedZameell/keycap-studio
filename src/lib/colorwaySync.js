// Cloud sync for custom (user-authored) colorways.
//
// localStorage stays the always-on source for the live session (see
// data/customColorways.js); this layer mirrors it to Supabase for signed-in
// users so colorways follow them across devices. Every function degrades to a
// no-op when Supabase is unconfigured, the user is logged out, or the
// `custom_colorways` table hasn't been created yet (see supabase/custom_colorways.sql)
// — so the app behaves exactly as the localStorage-only build until all three hold.

import { supabase, isSupabaseConfigured, getUser } from './supabase';

const TABLE = 'custom_colorways';

// One quiet log per process if the table is missing, so the console isn't spammed
// on every save while the migration hasn't been run yet.
let warnedMissingTable = false;
function noteError(where, error) {
  if (!error) return;
  // 42P01 = undefined_table (migration not run). PGRST205 = PostgREST schema cache miss.
  if (error.code === '42P01' || error.code === 'PGRST205') {
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.warn(`[colorwaySync] '${TABLE}' table missing — run supabase/custom_colorways.sql. Falling back to localStorage only.`);
    }
    return;
  }
  console.warn(`[colorwaySync] ${where}:`, error.message || error);
}

// DB row -> client colorway JSON (the shape getColorway/getKeyColors expect).
function rowToColorway(row) {
  return {
    id: row.id,
    label: row.label,
    manufacturer: row.manufacturer || '',
    swatches: row.swatches,
    override: row.override || {},
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  };
}

// Client colorway JSON -> DB row for the current user.
function colorwayToRow(cw, userId) {
  return {
    id: cw.id,
    user_id: userId,
    label: cw.label || 'My Colorway',
    manufacturer: cw.manufacturer || '',
    swatches: cw.swatches,
    override: cw.override || {},
    updated_at: new Date(cw.updatedAt || Date.now()).toISOString(),
  };
}

// True when cloud writes can actually happen. Resolves the user, so it's async.
async function activeUser() {
  if (!isSupabaseConfigured || !supabase) return null;
  try { return await getUser(); } catch { return null; }
}

// All of the signed-in user's colorways, keyed by id. {} on any failure.
export async function fetchRemoteColorways() {
  const user = await activeUser();
  if (!user) return {};
  const { data, error } = await supabase.from(TABLE).select('*').eq('user_id', user.id);
  if (error) { noteError('fetch', error); return {}; }
  const map = {};
  for (const row of data || []) map[row.id] = rowToColorway(row);
  return map;
}

// Create/update one colorway. Fire-and-forget friendly; never throws.
export async function upsertColorway(cw) {
  const user = await activeUser();
  if (!user || !cw?.id) return { skipped: true };
  const { error } = await supabase
    .from(TABLE)
    .upsert(colorwayToRow(cw, user.id), { onConflict: 'id' });
  noteError('upsert', error);
  return { error };
}

// Remove one colorway. Fire-and-forget friendly; never throws.
export async function deleteRemoteColorway(id) {
  const user = await activeUser();
  if (!user || !id) return { skipped: true };
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', user.id);
  noteError('delete', error);
  return { error };
}

// Two-way reconcile run once when a user signs in.
//   - remote-only colorways come down,
//   - local-only colorways go up,
//   - id in both -> newer updatedAt wins (last-write-wins), loser overwritten.
// Returns { merged, synced }. `merged` is always safe to apply to the store; on
// any failure it falls back to the unchanged local map so nothing is lost.
export async function syncOnSignIn(localMap = {}) {
  const user = await activeUser();
  if (!user) return { merged: localMap, synced: false };

  const remote = await fetchRemoteColorways();
  const merged = { ...remote };
  const toPush = [];

  for (const [id, local] of Object.entries(localMap)) {
    const r = remote[id];
    const localTs = local.updatedAt || 0;
    if (!r) {
      // Local-only — likely authored while logged out. Push it up, stamping a
      // time so the next device's merge can compare it.
      const stamped = { ...local, updatedAt: localTs || Date.now() };
      merged[id] = stamped;
      toPush.push(stamped);
    } else if (localTs > (r.updatedAt || 0)) {
      merged[id] = local;
      toPush.push(local);
    }
    // else: remote is newer-or-equal and already in `merged`.
  }

  await Promise.all(toPush.map((cw) => upsertColorway(cw).catch(() => {})));
  return { merged, synced: true };
}
