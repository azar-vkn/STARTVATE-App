import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

import { useApp } from '@/store/appStore';
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

  // Scroll to top on route change.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
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
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    initTheme();
    hydrate();
  }, [initTheme, hydrate]);

  // Hide the native splash once the app has hydrated.
  useEffect(() => {
    if (hydrated && Capacitor.isNativePlatform()) {
      SplashScreen.hide().catch(() => {});
    }
  }, [hydrated]);

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
