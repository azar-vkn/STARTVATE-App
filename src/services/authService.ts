import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { Session } from '@supabase/supabase-js';
import { requireSupabase, isSupabaseEnabled } from './supabase';

// ============================================================================
// Google authentication.
//
// WHY THIS IS NOT A PLAIN REDIRECT
// Google refuses OAuth requests originating from embedded WebViews
// (error: disallowed_useragent). A Capacitor app *is* a WebView, so signing in
// inline is impossible by design — it's an anti-phishing measure.
//
// So the flow hands off to the system browser (Chrome Custom Tabs on Android),
// which Google accepts, and comes back via a custom-scheme deep link:
//
//   1. Ask Supabase for the provider URL (skipBrowserRedirect: true)
//   2. Open it in the system browser
//   3. Google redirects to com.startvate.app://auth/callback?code=…
//   4. Android routes that back to us; we exchange the PKCE code for a session
//   5. Close the browser tab
//
// On the web (dev) there is no WebView restriction, so the ordinary redirect
// flow is used instead.
// ============================================================================

/** Must match the intent filter in AndroidManifest.xml and the Supabase
 *  "Redirect URLs" allow-list. */
export const REDIRECT_URL = 'com.startvate.app://auth/callback';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const isNative = () => Capacitor.isNativePlatform();

/**
 * Starts Google sign-in.
 *
 * On native this resolves once the browser has been opened — the session
 * arrives asynchronously through the deep-link listener registered by
 * `initDeepLinkAuth`. On web it resolves after the redirect is triggered.
 */
export async function signInWithGoogle(): Promise<void> {
  const sb = requireSupabase();

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: isNative() ? REDIRECT_URL : window.location.origin,
      skipBrowserRedirect: isNative(),
      queryParams: {
        // Ask for a refresh token and let the user pick an account rather than
        // silently reusing whichever one the browser saw last.
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw new AuthError(error.message);
  if (!data?.url) throw new AuthError('Google sign-in did not return a URL.');

  if (isNative()) {
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  } else {
    window.location.href = data.url;
  }
}

/**
 * Registers the deep-link listener that completes native sign-in.
 * Call once at startup; returns an unsubscribe function.
 */
export function initDeepLinkAuth(onSession: (session: Session | null) => void): () => void {
  if (!isSupabaseEnabled || !isNative()) return () => {};

  const handle = CapApp.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(REDIRECT_URL)) return;

    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get('code');
      const errorDescription =
        parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error');

      if (errorDescription) throw new AuthError(errorDescription);
      if (!code) throw new AuthError('No authorization code in the callback.');

      const sb = requireSupabase();
      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw new AuthError(error.message);

      onSession(data.session);
    } catch (err) {
      console.error('[auth] deep-link exchange failed', err);
      onSession(null);
    } finally {
      // Always dismiss the browser tab, successful or not, so the user is
      // never stranded on a blank callback page.
      await Browser.close().catch(() => {});
    }
  });

  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}

export async function signOut(): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw new AuthError(error.message);
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseEnabled) return null;
  const { data } = await requireSupabase().auth.getSession();
  return data.session;
}
