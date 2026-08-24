import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseEnabled } from '@/services/supabase';
import { initDeepLinkAuth, signInWithGoogle, signOut } from '@/services/authService';
import { storage, STORAGE_KEYS } from '@/services/storageService';

// ============================================================================
// Authentication state.
//
// Three terminal states the UI cares about:
//   • 'loading'  — restoring a persisted session
//   • 'guest'    — Supabase not configured, or the user chose to skip
//   • 'authed'   — signed in
// ============================================================================

export type AuthStatus = 'loading' | 'guest' | 'authed';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signingIn: boolean;
  error: string | null;
  /**
   * True once the user has gotten past the login screen without signing in —
   * either by choosing "explore without an account", or because this build has
   * no Supabase credentials. Distinguishes "hasn't seen login yet" from
   * "declined it", which `status: 'guest'` alone cannot.
   */
  guestChosen: boolean;

  init: () => Promise<() => void>;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  session: null,
  user: null,
  signingIn: false,
  error: null,
  guestChosen: false,

  init: async () => {
    // No backend configured — go straight to local mode, no login screen.
    if (!isSupabaseEnabled || !supabase) {
      set({ status: 'guest', guestChosen: true });
      return () => {};
    }

    const applySession = (session: Session | null) =>
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'authed' : 'guest',
        signingIn: false,
      });

    // Restore any persisted session first so returning users skip the login.
    const { data } = await supabase.auth.getSession();
    applySession(data.session);

    // Someone who previously chose to explore anonymously shouldn't be shown
    // the login wall again on every launch.
    if (!data.session) {
      const chosen = await storage.get<boolean>(STORAGE_KEYS.guestChosen, false);
      if (chosen) set({ guestChosen: true });
    }

    // Keep state in sync with token refreshes and sign-outs from anywhere.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));

    const disposeDeepLink = initDeepLinkAuth((session) => {
      if (session) applySession(session);
      else set({ signingIn: false });
    });

    return () => {
      subscription.unsubscribe();
      disposeDeepLink();
    };
  },

  signIn: async () => {
    if (get().signingIn) return;
    set({ signingIn: true, error: null });
    try {
      await signInWithGoogle();
      // On native the session arrives via the deep-link listener, so we stay
      // in `signingIn` until it does (or the user backs out).
    } catch (err) {
      set({
        signingIn: false,
        error: err instanceof Error ? err.message : 'Could not sign in with Google.',
      });
    }
  },

  logout: async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[auth] sign-out failed', err);
    } finally {
      // Reset guestChosen so signing out returns to the login screen rather
      // than dropping straight into anonymous mode.
      set({ session: null, user: null, status: 'guest', guestChosen: false });
      void storage.set(STORAGE_KEYS.guestChosen, false);
    }
  },

  continueAsGuest: () => {
    set({ status: 'guest', guestChosen: true, error: null, signingIn: false });
    void storage.set(STORAGE_KEYS.guestChosen, true);
  },

  clearError: () => set({ error: null }),
}));
