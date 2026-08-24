import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import type { Database } from '@/types/database';

// ============================================================================
// Supabase client.
//
// Credentials are injected at build time. When they're absent the app runs in
// local guest mode — everything still works, it just isn't synced or shared.
// `supabase` is therefore nullable, and callers must check `isSupabaseEnabled`.
//
// SECURITY: only the *anon* key belongs here. It is public by design and is
// safe to ship precisely because Row Level Security governs every table.
// Never put the service_role key in the app — it bypasses RLS entirely.
// ============================================================================

const URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const isSupabaseEnabled = Boolean(URL && ANON_KEY);

/**
 * Session storage backed by Capacitor Preferences.
 *
 * On Android this lands in native SharedPreferences, which survives WebView
 * data clears that would wipe localStorage and silently sign the user out.
 */
const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};

export const supabase: SupabaseClient<Database> | null = isSupabaseEnabled
  ? createClient<Database>(URL, ANON_KEY, {
      auth: {
        storage: capacitorStorage,
        storageKey: 'startvate.auth',
        autoRefreshToken: true,
        persistSession: true,
        // The app completes OAuth itself from the deep-link callback, so the
        // client must not try to parse tokens out of the page URL.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

/** Narrowing helper so call sites get a non-null client or a clear error. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
