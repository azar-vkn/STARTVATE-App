import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

import { useApp } from '@/store/appStore';
import { useAuth } from '@/store/authStore';
import { useTheme } from '@/store/themeStore';
import { BottomNav } from '@/components/BottomNav';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SparkMark } from '@/components/Brand';

import { DiscoverScreen } from '@/screens/DiscoverScreen';
import { ResultsScreen } from '@/screens/ResultsScreen';
import { FeedScreen } from '@/screens/FeedScreen';
import { CreatePostScreen } from '@/screens/CreatePostScreen';
import { AskAIScreen } from '@/screens/AskAIScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { LoginScreen } from '@/screens/LoginScreen';

// Routes that render their own full-height layout without the tab bar.
const FULLSCREEN_ROUTES = ['/feed/new', '/profile/edit'];

function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const showNav = !FULLSCREEN_ROUTES.includes(location.pathname);

  // Android hardware back button: navigate back, or exit from the root tab.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (location.pathname === '/') {
        CapApp.exitApp();
      } else if (canGoBack) {
        navigate(-1);
      } else {
        navigate('/');
      }
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <SyncErrorToast />
      <Routes>
        <Route path="/" element={<DiscoverScreen />} />
        <Route path="/results" element={<ResultsScreen />} />
        <Route path="/feed" element={<FeedScreen />} />
        <Route path="/feed/new" element={<CreatePostScreen />} />
        <Route path="/ask" element={<AskAIScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="/profile/edit" element={<EditProfileScreen />} />
        <Route path="*" element={<DiscoverScreen />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const hydrated = useApp((s) => s.hydrated);
  const onboarded = useApp((s) => s.onboarded);
  const hydrate = useApp((s) => s.hydrate);

  const authStatus = useAuth((s) => s.status);
  const guestChosen = useAuth((s) => s.guestChosen);
  const userId = useAuth((s) => s.user?.id ?? null);
  const initAuth = useAuth((s) => s.init);

  const initTheme = useTheme((s) => s.init);
  const [authReady, setAuthReady] = useState(false);

  // Theme first so the very first paint is already correct.
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    let dispose: (() => void) | undefined;
    initAuth()
      .then((d) => {
        dispose = d;
      })
      .catch((err) => console.error('[auth] init failed', err))
      .finally(() => setAuthReady(true));
    return () => dispose?.();
  }, [initAuth]);

  // Re-hydrate whenever the signed-in identity changes, so signing in or out
  // swaps between the remote and local datasets cleanly.
  useEffect(() => {
    if (!authReady || authStatus === 'loading') return;
    hydrate(userId);
  }, [authReady, authStatus, userId, hydrate]);

  useEffect(() => {
    if (hydrated && Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
  }, [hydrated]);

  if (!authReady || authStatus === 'loading') return <BootScreen />;

  // Gate order: sign in → onboarding → app.
  if (authStatus === 'guest' && !guestChosen) {
    return (
      <ErrorBoundary>
        <LoginScreen />
      </ErrorBoundary>
    );
  }

  if (!hydrated) return <BootScreen />;

  return (
    <ErrorBoundary>
      {onboarded ? (
        <HashRouter>
          <Shell />
        </HashRouter>
      ) : (
        <OnboardingScreen />
      )}
    </ErrorBoundary>
  );
}

/** Non-blocking banner for failed background syncs. */
function SyncErrorToast() {
  const syncError = useApp((s) => s.syncError);
  const clear = useApp((s) => s.clearSyncError);
  if (!syncError) return null;

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-50 px-4">
      <div className="mx-auto flex max-w-lg items-start gap-2 rounded-2xl border border-rose/30 bg-rose/15 px-4 py-3 backdrop-blur-lg">
        <span className="text-sm">⚠️</span>
        <p className="flex-1 text-[12.5px] leading-relaxed text-ink">{syncError}</p>
        <button onClick={clear} className="text-xs font-bold text-ink-faint" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}

function BootScreen() {
  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-3">
      <div className="animate-pulse-soft">
        <SparkMark size={44} />
      </div>
      <p className="text-sm font-extrabold tracking-tight">
        <span className="text-ink">START</span>
        <span className="text-gradient">VATE</span>
      </p>
    </div>
  );
}
