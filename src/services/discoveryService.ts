import type { DiscoveryItem, DiscoveryResult } from '@/types';
import { DISCOVERY_ITEMS } from '@/data/discoveryItems';
import { CATEGORIES } from '@/data/categories';
import { parseQuery, type ParsedQuery } from './nlp';
import { generateInsight } from './aiService';
import { searchApi, isApiConfigured, ApiUnavailableError } from './apiClient';

// ============================================================================
// Discovery engine.
//
// Live results come from the STARTVATE API, which aggregates official sources
// (Y Combinator, GitHub, Hacker News, OpenAlex, Grants.gov and Exa). When the
// API is unreachable — offline, not yet deployed, or degraded — we fall back to
// the bundled seed dataset so the app always returns something useful, and
// report that via `result.degraded`.
// ============================================================================

function scoreItem(item: DiscoveryItem, domains: string[], keywords: string[]): number {
  let score = 0;

  const domainMatches = item.domains.filter((d) => domains.includes(d)).length;
  score += domainMatches * 3;

  // Covering every requested domain separates a true "AI + agriculture" match
  // from something that merely happens to be AI.
  if (domains.length > 1 && domainMatches === domains.length) score += 4;

  const haystack = [item.title, item.subtitle, item.description, ...item.tags, ...item.domains]
    .join(' ')
    .toLowerCase();

  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 1.5;
  }

  return score;
}

/** Rank the bundled dataset locally — used for the offline fallback path. */
function rankLocal(parsed: ParsedQuery): DiscoveryItem[] {
  const hasSignal = parsed.domains.length > 0 || parsed.keywords.length > 0;

  const scored = DISCOVERY_ITEMS.map((item) => ({
    item,
    raw: scoreItem(item, parsed.domains, parsed.keywords),
  }));
  const maxScore = Math.max(1, ...scored.map((s) => s.raw));

  return scored
    .filter((s) => (hasSignal ? s.raw > 0 : true))
    .map((s) => ({ ...s.item, relevance: Math.min(1, s.raw / maxScore) }))
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
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
  const parsed = parseQuery(rawQuery);

  let items: DiscoveryItem[];
  let degraded: DiscoveryResult['degraded'];

  if (isApiConfigured()) {
    try {
      const res = await searchApi(rawQuery);
      items = res.items;

      const failed = res.sources.filter((s) => !s.ok).map((s) => s.name);

      // An empty live response is worse than showing the curated set.
      if (items.length === 0) {
        items = rankLocal(parsed);
        degraded = { reason: 'no-results', message: 'No live results — showing curated examples.' };
      } else if (failed.length > 0) {
        degraded = {
          reason: 'partial',
          message: `Some sources are unavailable (${failed.join(', ')}).`,
        };
      }
    } catch (err) {
      items = rankLocal(parsed);
      degraded = {
        reason: 'offline',
        message:
          err instanceof ApiUnavailableError
            ? 'Live data unavailable — showing curated examples.'
            : 'Something went wrong reaching live data.',
      };
    }
  } else {
    items = rankLocal(parsed);
    degraded = { reason: 'not-configured', message: 'Showing curated examples.' };
  }

  const sections = toSections(items);
  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  return {
    query: rawQuery.trim(),
    insight: generateInsight(parsed, items),
    sections,
    totalCount,
    degraded,
  };
}

/** Curated example searches shown on the Discover screen. */
export const TRENDING_SEARCHES = [
  'AI Agriculture Startup',
  'Fintech for emerging markets',
  'Climate battery software',
  'Health monitoring wearables',
  'EdTech LLM tutor',
  'Robotics for farms',
];
