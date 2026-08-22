import { create } from 'zustand';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'startvate.theme';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function resolve(pref: ThemePref): boolean {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark());
}

function apply(pref: ThemePref) {
  const dark = resolve(pref);
  document.documentElement.classList.toggle('dark', dark);
  const tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', dark ? '#1B1A18' : '#F7F5F0');

  // Keep the native status bar in sync on device.
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: dark ? '#1B1A18' : '#F7F5F0' }).catch(() => {});
  }
}

interface ThemeState {
  pref: ThemePref;
  isDark: boolean;
  init: () => void;
  setPref: (pref: ThemePref) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  pref: 'system',
  isDark: false,
  init: () => {
    const stored = (localStorage.getItem(KEY) as ThemePref | null) ?? 'system';
    apply(stored);
    set({ pref: stored, isDark: resolve(stored) });

    // React to OS theme changes while in "system" mode.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', () => {
      if (get().pref === 'system') {
        apply('system');
        set({ isDark: resolve('system') });
      }
    });
  },
  setPref: (pref) => {
    localStorage.setItem(KEY, pref);
    apply(pref);
    set({ pref, isDark: resolve(pref) });
  },
  // Cycle: light -> dark -> system -> light
  toggle: () => {
    const order: ThemePref[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(get().pref) + 1) % order.length];
    get().setPref(next);
  },
}));
