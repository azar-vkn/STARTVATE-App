import { create } from 'zustand';
import type {
  BuilderProfile,
  FeedPost,
  DiscoveryResult,
  ChatMessage,
  PostType,
} from '@/types';
import { storage, STORAGE_KEYS } from '@/services/storageService';
import { DEFAULT_PROFILE } from '@/data/defaults';
import { search as runSearch, SearchUnavailableError } from '@/services/discoveryService';
import { isSupabaseEnabled } from '@/services/supabase';
import {
  fetchProfile,
  saveProfileRemote,
  fetchFeed,
  createPost,
  setLike,
} from '@/services/dataService';

// ============================================================================
// Application state.
//
// Runs in one of two modes:
//   • remote — signed in; profile, posts and likes live in Supabase
//   • local  — guest or no backend; everything persists on-device only
//
// Writes are optimistic: state updates immediately, then syncs. If the sync
// fails the change is rolled back and surfaced via `syncError` rather than
// leaving the UI showing something the server never accepted.
// ============================================================================

type Mode = 'local' | 'remote';

interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  mode: Mode;
  userId: string | null;
  syncError: string | null;

  // Discovery
  query: string;
  searching: boolean;
  result: DiscoveryResult | null;
  searchError: string | null;
  recentSearches: string[];

  profile: BuilderProfile;
  posts: FeedPost[];
  chat: ChatMessage[];

  // actions
  hydrate: (userId: string | null) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  doSearch: (q: string) => Promise<void>;
  clearSearch: () => void;
  saveProfile: (p: BuilderProfile) => Promise<void>;
  addPost: (input: { type: PostType; body: string; tags: string[] }) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  pushChat: (m: ChatMessage) => Promise<void>;
  resetChat: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  clearSyncError: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  mode: 'local',
  userId: null,
  syncError: null,
  query: '',
  searching: false,
  result: null,
  searchError: null,
  recentSearches: [],
  profile: DEFAULT_PROFILE,
  posts: [],
  chat: [],

  hydrate: async (userId) => {
    const remote = Boolean(userId) && isSupabaseEnabled;

    // These are device-scoped regardless of mode.
    const [onboarded, recentSearches, chat] = await Promise.all([
      storage.get<boolean>(STORAGE_KEYS.onboarded, false),
      storage.get<string[]>(STORAGE_KEYS.recentSearches, []),
      storage.get<ChatMessage[]>(STORAGE_KEYS.chat, []),
    ]);

    if (remote && userId) {
      try {
        const [profile, posts] = await Promise.all([
          fetchProfile(userId),
          fetchFeed(userId),
        ]);
        set({
          hydrated: true,
          onboarded,
          recentSearches,
          chat,
          mode: 'remote',
          userId,
          profile: profile ?? { ...DEFAULT_PROFILE, id: userId },
          posts,
          syncError: null,
        });
        return;
      } catch (err) {
        console.error('[hydrate] remote load failed, falling back to local', err);
        // Fall through to local so the app still opens.
      }
    }

    const [profile, posts] = await Promise.all([
      storage.get<BuilderProfile>(STORAGE_KEYS.profile, DEFAULT_PROFILE),
      storage.get<FeedPost[]>(STORAGE_KEYS.posts, []),
    ]);

    set({
      hydrated: true,
      onboarded,
      recentSearches,
      chat,
      mode: 'local',
      userId: userId ?? null,
      profile,
      posts,
    });
  },

  completeOnboarding: async () => {
    set({ onboarded: true });
    await storage.set(STORAGE_KEYS.onboarded, true);
  },

  doSearch: async (q: string) => {
    const query = q.trim();
    if (!query) return;
    set({ searching: true, searchError: null, query });
    try {
      const result = await runSearch(query);
      const recent = [query, ...get().recentSearches.filter((s) => s !== query)].slice(0, 8);
      set({ result, searching: false, recentSearches: recent });
      await storage.set(STORAGE_KEYS.recentSearches, recent);
    } catch (err) {
      console.error('[search] failed', err);
      set({
        searching: false,
        result: null,
        searchError:
          err instanceof SearchUnavailableError
            ? err.message
            : 'Something went wrong. Please try again.',
      });
    }
  },

  clearSearch: () => set({ result: null, query: '', searchError: null }),

  saveProfile: async (p: BuilderProfile) => {
    const previous = get().profile;
    set({ profile: p, syncError: null });

    const { mode, userId } = get();
    if (mode === 'remote' && userId) {
      try {
        await saveProfileRemote(userId, p);
      } catch (err) {
        console.error('[profile] save failed', err);
        set({ profile: previous, syncError: 'Could not save your profile. Check your connection.' });
      }
    } else {
      await storage.set(STORAGE_KEYS.profile, p);
    }
  },

  addPost: async ({ type, body, tags }) => {
    const { profile, posts, mode, userId } = get();

    const optimistic: FeedPost = {
      id: `temp-${Date.now()}`,
      authorId: profile.id,
      authorName: profile.name,
      authorHeadline: profile.headline,
      avatarColor: profile.avatarColor,
      type,
      body: body.trim(),
      tags,
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
    };
    set({ posts: [optimistic, ...posts], syncError: null });

    if (mode === 'remote' && userId) {
      try {
        await createPost(userId, { type, body: body.trim(), tags });
        // Re-read so the post carries its real id and server timestamp.
        await get().refreshFeed();
      } catch (err) {
        console.error('[post] create failed', err);
        set({ posts, syncError: 'Could not publish your post. Please try again.' });
      }
    } else {
      await storage.set(STORAGE_KEYS.posts, get().posts);
    }
  },

  toggleLike: async (postId: string) => {
    const before = get().posts;
    const target = before.find((p) => p.id === postId);
    if (!target) return;

    const nextLiked = !target.liked;
    const next = before.map((p) =>
      p.id === postId ? { ...p, liked: nextLiked, likes: p.likes + (nextLiked ? 1 : -1) } : p,
    );
    set({ posts: next });

    const { mode, userId } = get();
    if (mode === 'remote' && userId) {
      try {
        await setLike(userId, postId, nextLiked);
      } catch (err) {
        console.error('[like] failed', err);
        set({ posts: before }); // roll back silently — a like isn't worth a banner
      }
    } else {
      await storage.set(STORAGE_KEYS.posts, next);
    }
  },

  refreshFeed: async () => {
    const { mode, userId } = get();
    if (mode !== 'remote' || !userId) return;
    try {
      // An empty feed is a legitimate state — apply it as-is.
      set({ posts: await fetchFeed(userId) });
    } catch (err) {
      console.error('[feed] refresh failed', err);
    }
  },

  pushChat: async (m: ChatMessage) => {
    const next = [...get().chat, m];
    set({ chat: next });
    await storage.set(STORAGE_KEYS.chat, next);
  },

  resetChat: async () => {
    set({ chat: [] });
    await storage.remove(STORAGE_KEYS.chat);
  },

  clearSyncError: () => set({ syncError: null }),
}));
