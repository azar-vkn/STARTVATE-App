import { Brand } from '@/components/Brand';
import { useAuth } from '@/store/authStore';
import { isSupabaseEnabled } from '@/services/supabase';

const HIGHLIGHTS = [
  { icon: '🔍', text: 'Search the whole startup ecosystem at once' },
  { icon: '🤝', text: 'Find co-founders, mentors and investors' },
  { icon: '🎯', text: 'Get opportunities matched to your idea' },
];

export function LoginScreen() {
  const { signIn, signingIn, error, continueAsGuest, clearError } = useAuth();

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col px-6">
      <div className="safe-top" />

      <div className="flex flex-1 flex-col justify-center">
        <div className="text-center">
          <Brand size="lg" withMark={false} />
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            The discovery and networking layer
            <br />
            for the startup ecosystem.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {HIGHLIGHTS.map((h) => (
            <div key={h.text} className="flex items-center gap-3 rounded-2xl bg-hair/[0.04] px-4 py-3">
              <span className="text-lg">{h.icon}</span>
              <span className="text-[13.5px] font-medium text-ink">{h.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="safe-bottom pb-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-2xl border border-rose/30 bg-rose/10 px-3.5 py-3">
            <span className="text-sm">⚠️</span>
            <div className="flex-1">
              <p className="text-[12.5px] leading-relaxed text-ink">{error}</p>
              <button
                onClick={clearError}
                className="mt-1 text-[11px] font-bold text-ink-faint underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isSupabaseEnabled ? (
          <>
            <button
              onClick={signIn}
              disabled={signingIn}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-hair/[0.12] bg-surface px-5 py-3.5 text-sm font-bold text-ink shadow-card transition active:scale-[0.98] disabled:opacity-60 dark:bg-elevated"
            >
              {signingIn ? (
                <>
                  <Spinner /> Signing in…
                </>
              ) : (
                <>
                  <GoogleIcon /> Continue with Google
                </>
              )}
            </button>

            <button
              onClick={continueAsGuest}
              className="mt-3 w-full py-2 text-xs font-bold text-ink-faint active:text-ink"
            >
              Explore without an account
            </button>
          </>
        ) : (
          <>
            <button className="btn-primary w-full" onClick={continueAsGuest}>
              Start exploring
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-faint">
              Sign-in is unavailable — this build has no Supabase credentials.
              Your profile and posts stay on this device.
            </p>
          </>
        )}

        <p className="mt-4 text-center text-[10.5px] leading-relaxed text-ink-faint">
          By continuing you agree to be a decent human to other builders.
        </p>
      </div>
    </div>
  );
}

/** Google's official 4-colour mark. */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-faint border-t-transparent" />
  );
}
