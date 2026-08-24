// ============================================================================
// STARTVATE — core domain models
// These types describe the startup ecosystem entities the platform surfaces.
// The discovery + AI services return these shapes. All data is live: it comes
// from the STARTVATE API, which aggregates official sources.
// ============================================================================

/** The category buckets a discovery search is organized into. */
export type CategoryKey =
  | 'founders'
  | 'startups'
  | 'cofounders'
  | 'mentors'
  | 'investors'
  | 'hackathons'
  | 'events'
  | 'incubators'
  | 'grants'
  | 'news'
  | 'communities'
  | 'resources';

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  /** One-line description shown under the section header. */
  blurb: string;
  icon: string; // emoji glyph — lightweight, no icon font dependency
  accent: 'brand' | 'accent' | 'amber' | 'rose' | 'sky';
}

/** A single discovery result. `kind` maps to a CategoryKey. */
export interface DiscoveryItem {
  id: string;
  kind: CategoryKey;
  title: string;
  subtitle: string;
  description: string;
  /** Free-form tags used both for display and for relevance matching. */
  tags: string[];
  /** Domains this item is relevant to, e.g. ['agriculture', 'ai']. */
  domains: string[];
  location?: string;
  /** Optional metrics shown as small stat pills. */
  stats?: { label: string; value: string }[];
  /** Canonical URL for this entity — opened by the card's action button. */
  link?: string;
  /** Populated at query time — how well this matched the search. 0..1 */
  relevance?: number;
  /** Upstream provider (e.g. "Y Combinator", "GitHub") shown as attribution. */
  source?: string;
}

/** The AI intelligence layer's structured read on a search. */
export interface AIInsight {
  query: string;
  domains: string[];
  summary: string;
  peopleToTalkTo: string[];
  opportunities: string[];
  competitorsToStudy: string[];
  nextSteps: string[];
  confidence: number; // 0..1
}

export interface DiscoveryResult {
  query: string;
  insight: AIInsight;
  /** Category -> items, already ranked by relevance. */
  sections: { meta: CategoryMeta; items: DiscoveryItem[] }[];
  totalCount: number;
  /**
   * Set when some upstream sources failed, so the user is told results are
   * incomplete instead of assuming they saw everything available.
   */
  degraded?: {
    reason: 'partial';
    message: string;
  };
}

// ---------------------------------------------------------------------------
// Builder profile
// ---------------------------------------------------------------------------

export type BuilderStage =
  | 'exploring'
  | 'ideating'
  | 'building-mvp'
  | 'launched'
  | 'scaling'
  | 'fundraising';

export type LookingFor =
  | 'co-founder'
  | 'team-member'
  | 'mentor'
  | 'investor'
  | 'customers'
  | 'feedback';

export interface BuilderProject {
  id: string;
  name: string;
  oneLiner: string;
  link?: string;
}

export interface BuilderProfile {
  id: string;
  name: string;
  headline: string;
  bio: string;
  location: string;
  avatarColor: string; // deterministic gradient seed
  skills: string[];
  interests: string[];
  startup?: string;
  stage: BuilderStage;
  lookingFor: LookingFor[];
  requirements: string; // co-founder / mentor / investor requirements
  projects: BuilderProject[];
  portfolioUrl?: string;
  domains: string[]; // areas they want to work in
}

// ---------------------------------------------------------------------------
// Builder feed
// ---------------------------------------------------------------------------

export type PostType =
  | 'idea'
  | 'launch'
  | 'looking-for-cofounder'
  | 'hiring'
  | 'progress'
  | 'question'
  | 'feedback'
  | 'opportunity'
  | 'showcase';

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorHeadline: string;
  avatarColor: string;
  type: PostType;
  body: string;
  tags: string[];
  createdAt: number; // epoch ms
  likes: number;
  comments: number;
  liked?: boolean;
}

// ---------------------------------------------------------------------------
// Ask AI
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}
