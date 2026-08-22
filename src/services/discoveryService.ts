import type { DiscoveryItem, DiscoveryResult } from '@/types';
import { DISCOVERY_ITEMS } from '@/data/discoveryItems';
import { CATEGORIES } from '@/data/categories';
import { parseQuery } from './nlp';
import { generateInsight } from './aiService';

// ============================================================================
// Discovery engine.
// Ranks the seed dataset against a parsed query and groups results by category.
//
// PRODUCTION SEAM: replace `search()` with calls to a real aggregation backend
// (search index over LinkedIn / Crunchbase / YC / events / grants, etc.). The
// UI only depends on the DiscoveryResult shape, so nothing else has to change.
// ============================================================================

/** Simulated network latency so loading states are exercised realistically. */
const LATENCY_MS = 550;

function scoreItem(item: DiscoveryItem, domains: string[], keywords: string[]): number {
  let score = 0;

  // Domain overlap is the strongest signal.
  const domainMatches = item.domains.filter((d) => domains.includes(d)).length;
  score += domainMatches * 3;

  // Reward items that cover *every* domain in the query. This is what separates
  // a true "AI + agriculture" match from something that merely happens to be AI.
  if (domains.length > 1 && domainMatches === domains.length) {
    score += 4;
  }

  // Keyword hits across title, description and tags.
  const haystack = [
    item.title,
    item.subtitle,
    item.description,
    ...item.tags,
    ...item.domains,
  ]
    .join(' ')
    .toLowerCase();

  for (const kw of keywords) {
    if (haystack.includes(kw)) score += 1.5;
  }

  return score;
}

export async function search(rawQuery: string): Promise<DiscoveryResult> {
  const parsed = parseQuery(rawQuery);
  await new Promise((r) => setTimeout(r, LATENCY_MS));

  const hasSignal = parsed.domains.length > 0 || parsed.keywords.length > 0;

  // Score every item; keep only those with signal, ranked by relevance.
  const scored = DISCOVERY_ITEMS.map((item) => {
    const raw = scoreItem(item, parsed.domains, parsed.keywords);
    return { item, raw };
  });

  const maxScore = Math.max(1, ...scored.map((s) => s.raw));

  const relevant = scored
    .filter((s) => (hasSignal ? s.raw > 0 : true))
    .map((s) => ({
      ...s.item,
      relevance: Math.min(1, s.raw / maxScore),
    }))
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));

  // Group into category sections, preserving the canonical category order.
  // Within a category we drop weak tail matches once we have strong ones, so a
  // search stays focused instead of padding out with loosely-related items.
  const sections = CATEGORIES.map((meta) => {
    const inCategory = relevant.filter((i) => i.kind === meta.key);
    const top = inCategory[0]?.relevance ?? 0;
    const focused = inCategory.filter((i) => (i.relevance ?? 0) >= top * 0.55);
    return { meta, items: (focused.length >= 2 ? focused : inCategory).slice(0, 8) };
  }).filter((s) => s.items.length > 0);

  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  const insight = generateInsight(parsed, relevant);

  return {
    query: rawQuery.trim(),
    insight,
    sections,
    totalCount,
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
