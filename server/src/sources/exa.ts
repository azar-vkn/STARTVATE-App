import type { Source, DiscoveryItem, CategoryKey, ParsedQuery, Env } from '../types';
import { clamp, inferDomains, domainLabel } from '../nlp';
import { postJSON, itemId } from '../lib';

// ============================================================================
// Exa — neural/semantic web search (https://exa.ai).
//
// Exa is the piece that covers the categories with no good free API:
// competitors, hackathons, conferences, accelerators and investors. Its
// embedding search understands "companies like X" rather than matching
// keywords, which is exactly the discovery problem here.
//
// Commercial API with terms that permit this use. Requires EXA_API_KEY;
// when the key is absent the source disables itself and the rest of the
// fan-out still returns results.
// ============================================================================

interface ExaResult {
  id: string;
  url: string;
  title: string | null;
  publishedDate?: string | null;
  author?: string | null;
  text?: string;
  summary?: string;
}

const ENDPOINT = 'https://api.exa.ai/search';

/**
 * Each lane is one semantic query mapped to one category. Phrasing matters
 * more than keywords with a neural index, so these read like descriptions of
 * the ideal result page.
 */
interface Lane {
  kind: CategoryKey;
  /** Builds the natural-language query for a parsed search. */
  query: (focus: string) => string;
  results: number;
  /** Restrict to pages published recently — used for time-sensitive lanes. */
  recentDays?: number;
  subtitle: string;
}

const LANES: Lane[] = [
  {
    kind: 'startups',
    query: (f) => `startup company building ${f}`,
    results: 6,
    subtitle: 'Company',
  },
  {
    kind: 'hackathons',
    query: (f) => `upcoming hackathon or startup competition for ${f}`,
    results: 4,
    recentDays: 240,
    subtitle: 'Competition',
  },
  {
    kind: 'events',
    query: (f) => `${f} startup conference or summit for founders`,
    results: 4,
    recentDays: 300,
    subtitle: 'Event',
  },
  {
    kind: 'incubators',
    query: (f) => `accelerator or incubator program for ${f} startups`,
    results: 4,
    subtitle: 'Program',
  },
  {
    kind: 'investors',
    query: (f) => `venture capital firm investing in ${f} startups`,
    results: 5,
    subtitle: 'Investor',
  },
];

export const exaSource: Source = {
  name: 'exa',
  ttl: 60 * 60 * 12,

  enabled: (env) => Boolean(env.EXA_API_KEY),

  async fetch(q, env, signal) {
    if (!env.EXA_API_KEY) return [];
    const focus = describeFocus(q);
    if (!focus) return [];

    // Run every lane in parallel; a failing lane costs only its own results.
    const lanes = await Promise.all(
      LANES.map(async (lane) => {
        try {
          const body: Record<string, unknown> = {
            query: lane.query(focus),
            numResults: lane.results,
            type: 'auto',
            contents: { summary: true },
          };
          if (lane.recentDays) {
            body.startPublishedDate = new Date(
              Date.now() - lane.recentDays * 86400000,
            ).toISOString();
          }

          const res = await postJSON<{ results?: ExaResult[] }>(ENDPOINT, body, {
            headers: { 'x-api-key': env.EXA_API_KEY! },
            signal,
          });

          return (res.results ?? [])
            .filter((r) => r.title && r.url)
            .map<DiscoveryItem>((r) => ({
              id: itemId(`exa-${lane.kind}`, r.id || r.url),
              kind: lane.kind,
              title: clamp(cleanTitle(r.title!), 70),
              subtitle: `${lane.subtitle} · ${hostname(r.url)}`,
              description: clamp(r.summary || r.text || 'Discovered via semantic web search.', 185),
              tags: [lane.kind, 'web'],
              domains: inferDomains(`${r.title} ${r.summary ?? ''}`),
              stats: r.publishedDate
                ? [{ label: 'Published', value: r.publishedDate.slice(0, 10) }]
                : undefined,
              link: r.url,
              source: 'Exa',
            }));
        } catch {
          return [] as DiscoveryItem[];
        }
      }),
    );

    return lanes.flat();
  },
};

/** Turn a parsed query into a natural-language topic description for Exa. */
function describeFocus(q: ParsedQuery): string {
  if (q.domains.length > 0) {
    const labels = q.domains.map(domainLabel).join(' and ');
    const extra = q.keywords.filter((k) => k.length > 3).slice(0, 2).join(' ');
    return `${labels}${extra ? ` (${extra})` : ''}`;
  }
  return q.keywords.slice(0, 4).join(' ');
}

/** Strip the boilerplate suffixes that dominate scraped page titles. */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*(Home|Official Site|Homepage).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

/** Exported so the worker can report why the source was skipped. */
export function exaConfigured(env: Env): boolean {
  return Boolean(env.EXA_API_KEY);
}
