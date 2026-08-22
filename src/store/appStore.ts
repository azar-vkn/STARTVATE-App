import { create } from 'zustand';
import type {
  BuilderProfile,
  FeedPost,
  DiscoveryResult,
  ChatMessage,
  PostType,
} from '@/types';
import { storage, STORAGE_KEYS } from '@/services/storageService';
import { DEFAULT_PROFILE, SEED_POSTS } from '@/data/seed';
import { search as runSearch } from '@/services/discoveryService';

interface AppState {
  hydrated: boolean;
  onboarded: boolean;

  // Discovery
  query: string;
  searching: boolean;
  result: DiscoveryResult | null;
  searchError: string | null;
  recentSearches: string[];

  // Profile
  profile: BuilderProfile;

  // Feed
  posts: FeedPost[];

  // Chat
  chat: ChatMessage[];

  // actions
  hydrate: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  doSearch: (q: string) => Promise<void>;
  clearSearch: () => void;
  saveProfile: (p: BuilderProfile) => Promise<void>;
  addPost: (input: { type: PostType; body: string; tags: string[] }) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  pushChat: (m: ChatMessage) => Promise<void>;
  resetChat: () => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  onboarded: false,
  query: '',
  searching: false,
  result: null,
  searchError: null,
  recentSearches: [],
  profile: DEFAULT_PROFILE,
  posts: SEED_POSTS,
  chat: [],

  hydrate: async () => {
    const [onboarded, profile, posts, recentSearches, chat] = await Promise.all([
      storage.get<boolean>(STORAGE_KEYS.onboarded, false),
      storage.get<BuilderProfile>(STORAGE_KEYS.profile, DEFAULT_PROFILE),
      storage.get<FeedPost[]>(STORAGE_KEYS.posts, SEED_POSTS),
      storage.get<string[]>(STORAGE_KEYS.recentSearches, []),
      storage.get<ChatMessage[]>(STORAGE_KEYS.chat, []),
    ]);
    set({ hydrated: true, onboarded, profile, posts, recentSearches, chat });
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
      set({ searching: false, searchError: 'Something went wrong. Please try again.' });
    }
  },

  clearSearch: () => set({ result: null, query: '', searchError: null }),

  saveProfile: async (p: BuilderProfile) => {
    set({ profile: p });
    await storage.set(STORAGE_KEYS.profile, p);
  },

  addPost: async ({ type, body, tags }) => {
    const { profile, posts } = get();
    const post: FeedPost = {
      id: `p-${Date.now()}`,
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
    const next = [post, ...posts];
    set({ posts: next });
    await storage.set(STORAGE_KEYS.posts, next);
  },

  toggleLike: async (postId: string) => {
    const next = get().posts.map((p) =>
      p.id === postId
        ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
        : p,
    );
    set({ posts: next });
    await storage.set(STORAGE_KEYS.posts, next);
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
}));
