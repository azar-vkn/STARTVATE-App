// ============================================================================
// Shared contract between the STARTVATE API and the mobile app.
// These mirror src/types/index.ts in the app — keep the two in sync.
// ============================================================================

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

export interface DiscoveryItem {
  id: string;
  kind: CategoryKey;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  domains: string[];
  location?: string;
  stats?: { label: string; value: string }[];
  link?: string;
  relevance?: number;
  /** Which upstream source produced this item — shown as attribution. */
  source?: string;
}

/** Per-source outcome, returned so the client can degrade transparently. */
export interface SourceReport {
  name: string;
  ok: boolean;
  count: number;
  ms: number;
  error?: string;
  /** True when the result came from the KV cache rather than upstream. */
  cached?: boolean;
}

export interface SearchResponse {
  query: string;
  domains: string[];
  items: DiscoveryItem[];
  sources: SourceReport[];
  /** Epoch ms this payload was generated. */
  generatedAt: number;
}

/** Cloudflare Worker bindings. */
export interface Env {
  /** KV namespace used to cache upstream responses. */
  CACHE: KVNamespace;

  // --- Secrets (set with `wrangler secret put <NAME>`) ---
  /** GitHub PAT (public_repo / read-only). Raises rate limit 60 -> 5000/hr. */
  GITHUB_TOKEN?: string;
  /** Exa API key — powers semantic discovery of competitors/events/investors. */
  EXA_API_KEY?: string;
  /** Optional: enables LLM-generated insight on /api/insight. */
  ANTHROPIC_API_KEY?: string;

  // --- Vars (set in wrangler.toml) ---
  /** Contact address sent to OpenAlex's polite pool for higher priority. */
  CONTACT_EMAIL?: string;
  /** Comma-separated list of allowed browser origins for CORS. */
  ALLOWED_ORIGINS?: string;
}

/** A normalized query, produced by the shared NLP layer. */
export interface ParsedQuery {
  raw: string;
  keywords: string[];
  domains: string[];
}

/** Every source adapter implements this. */
export interface Source {
  name: string;
  /** Cache TTL in seconds for this source's results. */
  ttl: number;
  /** Returns [] rather than throwing whenever it can degrade gracefully. */
  fetch(q: ParsedQuery, env: Env, signal: AbortSignal): Promise<DiscoveryItem[]>;
  /** Skip the source when its credentials are absent. */
  enabled?(env: Env): boolean;
}
