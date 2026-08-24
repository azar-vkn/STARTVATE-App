import type { DiscoveryItem, DiscoveryResult } from '@/types';
import { CATEGORIES } from '@/data/categories';
import { parseQuery } from './nlp';
import { generateInsight } from './aiService';
import { searchApi, isApiConfigured, ApiUnavailableError } from './apiClient';

// ============================================================================
// Discovery engine.
//
// Every result comes from the STARTVATE API, which aggregates official sources
// (Y Combinator, GitHub, Hacker News, OpenAlex, Grants.gov and Exa).
//
// There is deliberately NO local fallback dataset. Showing invented founders
// and non-existent grants would be worse than showing nothing: a user could
// waste real time chasing a company or funding round that does not exist.
// When live data is unavailable the app says so plainly and offers a retry.
// ============================================================================

/** Raised when the search could not be completed at all. */
export class SearchUnavailableError extends Error {
  readonly reason: 'not-configured' | 'offline';

  constructor(reason: 'not-configured' | 'offline', message: string) {
    super(message);
    this.name = 'SearchUnavailableError';
    this.reason = reason;
  }
}

/**
 * Group ranked items into category sections.
 * Weak tail matches are dropped once a category has strong ones, so results
 * stay focused instead of padding out with loosely-related entries.
 */
function toSections(items: DiscoveryItem[]) {
  return CATEGORIES.map((meta) => {
    const inCategory = items.filter((i) => i.kind === meta.key);
    const top = inCategory[0]?.relevance ?? 0;
    const focused = inCategory.filter((i) => (i.relevance ?? 0) >= top * 0.55);
    return { meta, items: (focused.length >= 2 ? focused : inCategory).slice(0, 8) };
  }).filter((s) => s.items.length > 0);
}

export async function search(rawQuery: string): Promise<DiscoveryResult> {
  if (!isApiConfigured()) {
    throw new SearchUnavailableError(
      'not-configured',
      'This build has no discovery API configured, so there is nothing to search yet.',
    );
  }

  const parsed = parseQuery(rawQuery);

  let items: DiscoveryItem[];
  let failedSources: string[];

  try {
    const res = await searchApi(rawQuery);
    items = res.items;
    failedSources = res.sources.filter((s) => !s.ok).map((s) => s.name);
  } catch (err) {
    throw new SearchUnavailableError(
      'offline',
      err instanceof ApiUnavailableError
        ? 'Could not reach live data. Check your connection and try again.'
        : 'Something went wrong fetching live data.',
    );
  }

  const sections = toSections(items);

  return {
    query: rawQuery.trim(),
    insight: generateInsight(parsed, items),
    sections,
    totalCount: sections.reduce((sum, s) => sum + s.items.length, 0),
    // Only flag partial degradation — a fully successful but empty search is
    // an honest "no results", handled by the empty state.
    degraded:
      failedSources.length > 0
        ? {
            reason: 'partial',
            message: `Some sources are unavailable right now (${failedSources.join(', ')}), so results may be incomplete.`,
          }
        : undefined,
  };
}

/** Example searches shown on the Discover screen. */
export const TRENDING_SEARCHES = [
  'AI Agriculture Startup',
  'Fintech for emerging markets',
  'Climate battery software',
  'Health monitoring wearables',
  'EdTech LLM tutor',
  'Robotics for farms',
];
