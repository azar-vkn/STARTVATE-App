import type { Source, DiscoveryItem } from '../types';
import { clamp, inferDomains } from '../nlp';
import { getJSON, itemId } from '../lib';

// ============================================================================
// OpenAlex — free, CC0 public-domain scholarly graph. No key required.
//
// Finding real domain experts is a two-step problem: searching /authors
// directly matches on names and returns noise. Instead we find the most
// *relevant* recent, well-cited works and surface the researchers behind them.
//
//   • Lead authors of relevant papers -> `mentors` (domain experts)
//
// `mailto` opts us into OpenAlex's polite pool, which gets faster service.
// ============================================================================

interface Institution {
  display_name: string;
  country_code: string | null;
}

interface Authorship {
  author_position: string;
  author: { id: string | null; display_name: string; orcid: string | null };
  institutions: Institution[];
}

interface Work {
  id: string;
  display_name: string;
  publication_year: number;
  cited_by_count: number;
  authorships: Authorship[];
  topics?: { display_name: string }[];
  doi?: string | null;
}

const BASE = 'https://api.openalex.org/works';

export const openAlexSource: Source = {
  name: 'openalex',
  ttl: 60 * 60 * 24 * 3, // 3d — the research graph changes slowly

  async fetch(q, env, signal) {
    const terms = q.keywords.slice(0, 5).join(' ').trim();
    if (!terms) return [];

    // Recent + meaningfully cited keeps out both stale and unvetted work.
    const filter = [
      `title_and_abstract.search:${terms}`,
      'from_publication_date:2022-01-01',
      'cited_by_count:>15',
    ].join(',');

    const url =
      `${BASE}?filter=${encodeURIComponent(filter)}` +
      `&sort=relevance_score:desc&per-page=12` +
      (env.CONTACT_EMAIL ? `&mailto=${encodeURIComponent(env.CONTACT_EMAIL)}` : '');

    const data = await getJSON<{ results?: Work[] }>(url, { signal });
    const works = data.results ?? [];
    if (works.length === 0) return [];

    // One entry per researcher, keeping their strongest paper as evidence.
    const experts = new Map<string, { author: Authorship; work: Work }>();

    for (const work of works) {
      // Lead and senior authors are the ones worth reaching out to.
      const notable = work.authorships.filter(
        (a) => a.author_position === 'first' || a.author_position === 'last',
      );
      for (const a of notable) {
        const key = a.author.id ?? a.author.display_name;
        if (!key || experts.has(key)) continue;
        experts.set(key, { author: a, work });
      }
    }

    return [...experts.values()]
      .slice(0, 6)
      .map<DiscoveryItem>(({ author, work }) => {
        const inst = author.institutions[0];
        const topic = work.topics?.[0]?.display_name;
        return {
          id: itemId('oa', author.author.id ?? author.author.display_name),
          kind: 'mentors',
          title: formatName(author.author.display_name),
          subtitle: inst ? `Researcher · ${clamp(inst.display_name, 42)}` : 'Domain researcher',
          description: clamp(
            `Published "${work.display_name}" (${work.publication_year}), cited ${work.cited_by_count} times.`,
            190,
          ),
          tags: [topic, 'research', author.author.orcid ? 'orcid' : null].filter(
            (t): t is string => Boolean(t),
          ),
          domains: inferDomains(`${work.display_name} ${topic ?? ''}`),
          location: inst?.country_code ?? undefined,
          stats: [{ label: 'Cited', value: String(work.cited_by_count) }],
          link: work.doi ?? work.id,
          source: 'OpenAlex',
        };
      });
  },
};

/** OpenAlex returns some names as "Last, First" — normalize for display. */
function formatName(name: string): string {
  if (!name.includes(',')) return name;
  const [last, first] = name.split(',').map((s) => s.trim());
  return first ? `${first} ${last}` : last;
}
