import type { Source, DiscoveryItem } from '../types';
import { clamp, inferDomains } from '../nlp';
import { getJSON, itemId } from '../lib';

// ============================================================================
// Y Combinator — via the community-maintained yc-oss/api.
//
// Static JSON served from GitHub Pages: no key, no rate limit, no ToS friction.
// Industry-scoped files keep payloads small (tens of companies, not 6,000+).
//
// Yields real YC companies as `startups` — the competitor/benchmark set.
// ============================================================================

interface YcCompany {
  id: number;
  name: string;
  slug: string;
  website: string;
  all_locations: string;
  one_liner: string;
  long_description: string;
  team_size: number | null;
  industry: string;
  subindustry: string;
  tags: string[];
  batch: string;
  status: string;
  top_company: boolean;
  isHiring: boolean;
  industries: string[];
  url?: string;
}

interface YcMeta {
  industries?: Record<string, { name: string; count: number; api: string }>;
}

/**
 * Map our canonical domains onto YC's industry slugs. Several of ours map to
 * more than one YC industry, so we union the results.
 */
const DOMAIN_TO_YC: Record<string, string[]> = {
  agriculture: ['agriculture'],
  ai: ['ai', 'machine-learning', 'ai-assistant'],
  fintech: ['fintech', 'banking-and-exchange', 'credit-and-lending', 'consumer-finance'],
  payments: ['payments'],
  healthtech: ['healthcare', 'diagnostics', 'consumer-health-and-wellness'],
  biotech: ['biotech', 'drug-discovery-and-delivery'],
  climate: ['climate'],
  energy: ['energy'],
  edtech: ['education'],
  robotics: ['robotics', 'drones'],
  saas: ['b2b', 'engineering-product-and-design'],
  iot: ['hardware'],
  mobility: ['supply-chain-and-logistics', 'automotive'],
  geospatial: ['drones'],
};

const META_URL = 'https://yc-oss.github.io/api/meta.json';

export const ycSource: Source = {
  name: 'ycombinator',
  ttl: 60 * 60 * 24, // 24h — the dataset rebuilds daily

  async fetch(q, _env, signal) {
    if (q.domains.length === 0) return [];

    const meta = await getJSON<YcMeta>(META_URL, { signal });
    const industries = meta.industries ?? {};

    // Resolve our domains to the industry endpoints that actually exist.
    const slugs = [
      ...new Set(q.domains.flatMap((d) => DOMAIN_TO_YC[d] ?? []).filter((s) => industries[s])),
    ].slice(0, 3);
    if (slugs.length === 0) return [];

    const batches = await Promise.all(
      slugs.map(async (slug) => {
        try {
          return await getJSON<YcCompany[]>(industries[slug].api, { signal });
        } catch {
          return [] as YcCompany[]; // a single missing industry file is survivable
        }
      }),
    );

    // Union, de-duplicate by company id, then rank.
    const byId = new Map<number, YcCompany>();
    for (const list of batches) for (const c of list) byId.set(c.id, c);

    const companies = [...byId.values()]
      .filter((c) => c.one_liner)
      .sort((a, b) => score(b, q.keywords) - score(a, q.keywords))
      .slice(0, 10);

    return companies.map<DiscoveryItem>((c) => ({
      id: itemId('yc', c.id),
      kind: 'startups',
      title: c.name,
      subtitle: `YC ${c.batch}${c.status && c.status !== 'Active' ? ` · ${c.status}` : ''}`,
      description: clamp(c.one_liner || c.long_description),
      tags: (c.tags ?? []).slice(0, 4),
      domains: inferDomains(
        `${c.one_liner} ${c.long_description} ${(c.tags ?? []).join(' ')} ${c.subindustry}`,
      ),
      location: firstLocation(c.all_locations),
      stats: [
        ...(c.team_size ? [{ label: 'Team', value: String(c.team_size) }] : []),
        ...(c.isHiring ? [{ label: '', value: 'Hiring' }] : []),
      ],
      link: c.website || `https://www.ycombinator.com/companies/${c.slug}`,
      source: 'Y Combinator',
    }));
  },
};

/**
 * Prefer active, recent, keyword-matching and top companies. Recency matters:
 * a 2012 batch company is history, while a recent one is a live competitor.
 */
function score(c: YcCompany, keywords: string[]): number {
  const hay = `${c.name} ${c.one_liner} ${c.long_description} ${(c.tags ?? []).join(' ')}`.toLowerCase();
  let s = 0;
  for (const k of keywords) if (hay.includes(k)) s += 2;
  if (c.status === 'Active') s += 1.5;
  if (c.top_company) s += 1;

  // Batch reads like "Winter 2012" / "Summer 2024".
  const year = Number(c.batch?.match(/\d{4}/)?.[0]);
  if (Number.isFinite(year)) {
    const age = new Date().getFullYear() - year;
    if (age <= 2) s += 3;
    else if (age <= 5) s += 1.5;
    else if (age >= 10) s -= 1.5;
  }
  return s;
}

function firstLocation(all: string): string | undefined {
  if (!all) return undefined;
  const first = all.split(';')[0]?.trim();
  return first || undefined;
}
