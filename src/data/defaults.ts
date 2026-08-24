import type { BuilderProfile } from '@/types';

// ============================================================================
// Defaults — not sample data.
//
// This is the blank profile a brand-new user starts from before they've filled
// anything in, and before Supabase has returned their stored profile. It is
// deliberately empty: STARTVATE shows real people and real opportunities or it
// shows nothing at all.
// ============================================================================

export const DEFAULT_PROFILE: BuilderProfile = {
  id: 'me',
  name: 'Your Name',
  headline: 'Builder exploring what to create next',
  bio: '',
  location: '',
  avatarColor: 'brand',
  skills: [],
  interests: [],
  startup: undefined,
  stage: 'exploring',
  lookingFor: [],
  requirements: '',
  projects: [],
  portfolioUrl: undefined,
  domains: [],
};
