import type { Source, DiscoveryItem } from '../types';
import { clamp, inferDomains } from '../nlp';
import { getJSON, itemId } from '../lib';

// ============================================================================
// Hacker News — via the official Algolia search API.
// Free, unauthenticated, stable and explicitly public.
//
//   • Front-page-grade stories -> `news`
//   • Ask HN / Show HN threads -> `communities` (live discussions to join)
// ============================================================================

interface HnHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  story_text?: string | null;
  _tags?: string[];
}

const BASE = 'https://hn.algolia.com/api/v1/search';

/** Stories from the last ~18 months so results stay current. */
function since(): number {
  return Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 550;
}

export const hackerNewsSource: Source = {
  name: 'hackernews',
  ttl: 60 * 60 * 2, // 2h — news moves fast

  async fetch(q, _env, signal) {
    const terms = q.keywords.slice(0, 4).join(' ').trim();
    if (!terms) return [];

    const common =
      `query=${encodeURIComponent(terms)}` +
      `&numericFilters=created_at_i>${since()}`;

    const [stories, discussions] = await Promise.all([
      getJSON<{ hits: HnHit[] }>(
        `${BASE}?${common}&tags=story&hitsPerPage=8`,
        { signal },
      ).catch(() => ({ hits: [] as HnHit[] })),
      getJSON<{ hits: HnHit[] }>(
        `${BASE}?${common}&tags=ask_hn&hitsPerPage=5`,
        { signal },
      ).catch(() => ({ hits: [] as HnHit[] })),
    ]);

    const items: DiscoveryItem[] = [];

    for (const h of stories.hits) {
      if (!h.title || (h.points ?? 0) < 8) continue; // filter out noise
      items.push({
        id: itemId('hn', h.objectID),
        kind: 'news',
        title: clamp(h.title, 90),
        subtitle: `Hacker News · ${timeAgo(h.created_at)}`,
        description: clamp(
          h.story_text?.replace(/<[^>]+>/g, ' ') ||
            `Discussed by ${h.num_comments ?? 0} people on Hacker News.`,
        ),
        tags: (h._tags ?? []).filter((t) => !t.startsWith('author_') && !t.startsWith('story_')).slice(0, 3),
        domains: inferDomains(h.title),
        stats: [
          { label: '▲', value: String(h.points ?? 0) },
          { label: '💬', value: String(h.num_comments ?? 0) },
        ],
        link: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: 'Hacker News',
      });
    }

    for (const h of discussions.hits) {
      if (!h.title) continue;
      items.push({
        id: itemId('hn-ask', h.objectID),
        kind: 'communities',
        title: clamp(h.title, 90),
        subtitle: `Discussion · ${h.num_comments ?? 0} replies`,
        description: clamp(
          h.story_text?.replace(/<[^>]+>/g, ' ') ||
            'An open thread where builders are sharing experience on this topic.',
        ),
        tags: ['hacker-news', 'discussion'],
        domains: inferDomains(h.title),
        stats: [{ label: '▲', value: String(h.points ?? 0) }],
        link: `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: 'Hacker News',
      });
    }

    return items;
  },
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
