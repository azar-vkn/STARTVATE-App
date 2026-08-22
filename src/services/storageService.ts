import { Preferences } from '@capacitor/preferences';

// ============================================================================
// Thin persistence wrapper.
// Uses Capacitor Preferences on device (survives app restarts) and transparently
// falls back to localStorage when running in a plain browser during development.
// ============================================================================

const hasPreferences = () => typeof Preferences?.get === 'function';

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      let raw: string | null = null;
      if (hasPreferences()) {
        const res = await Preferences.get({ key });
        raw = res.value;
      } else {
        raw = localStorage.getItem(key);
      }
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[storage] failed to read "${key}"`, err);
      return fallback;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const raw = JSON.stringify(value);
      if (hasPreferences()) {
        await Preferences.set({ key, value: raw });
      } else {
        localStorage.setItem(key, raw);
      }
    } catch (err) {
      console.warn(`[storage] failed to write "${key}"`, err);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (hasPreferences()) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn(`[storage] failed to remove "${key}"`, err);
    }
  },
};

export const STORAGE_KEYS = {
  profile: 'startvate.profile',
  posts: 'startvate.posts',
  recentSearches: 'startvate.recentSearches',
  chat: 'startvate.chat',
  onboarded: 'startvate.onboarded',
} as const;
