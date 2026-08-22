import type { DiscoveryItem, ParsedQuery } from './types';

// ============================================================================
// Relevance ranking across merged multi-source results.
// Mirrors the app's scoring so client-side fallback ranks the same way.
// ============================================================================

function scoreItem(item: DiscoveryItem, q: ParsedQuery): number {
  let score = 0;

  const domainMatches = item.domains.filter((d) => q.domains.includes(d)).length;
  score += domainMatches * 3;

  // Covering every requested domain is what separates a true
  // "AI + agriculture" match from something that merely happens to be AI.
  if (q.domains.length > 1 && domainMatches === q.domains.length) score += 4;

  const haystack = [item.title, item.subtitle, item.description, ...item.tags, ...item.domains]
    .join(' ')
    .toLowerCase();

  for (const kw of q.keywords) {
    if (haystack.includes(kw)) score += 1.5;
  }

  // A source that returned nothing usable shouldn't outrank a real match, but
  // items carrying a working link are more actionable than those without.
  if (item.link) score += 0.5;

  return score;
}

/**
 * Assign 0..1 relevance and sort. Items keep their absolute score relative to
 * the strongest result so the client can apply per-category cutoffs.
 */
export function rank(items: DiscoveryItem[], q: ParsedQuery): DiscoveryItem[] {
  const scored = items.map((item) => ({ item, raw: scoreItem(item, q) }));
  const max = Math.max(1, ...scored.map((s) => s.raw));

  return scored
    .map(({ item, raw }) => ({ ...item, relevance: Math.min(1, raw / max) }))
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
}
