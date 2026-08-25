import type { Source, DiscoveryItem, ParsedQuery, Env } from '../types';
import { clamp, inferDomains } from '../nlp';
import { getJSON, itemId } from '../lib';

// ============================================================================
// Domain experts, for the `mentors` category.
//
// Two providers, tried in order:
//
//   1. OpenAlex — richer data (institutions, citation counts, ORCID), but its
//      free tier now enforces a per-IP daily budget. Cloudflare Workers egress
//      from shared IPs, so that budget is frequently already spent by other
//      tenants and the API returns 429 "Insufficient budget". Passing `mailto`
//      does not help: the limit is tied to the IP, not the caller.
//
//   2. Crossref — less detail, but genuinely open with no per-IP budget, so it
//      keeps the category alive when OpenAlex is exhausted.
//
// Finding experts is a two-step problem either way: searching authors directly
// matches on names and returns noise, so we find the most relevant recent,
// well-cited work and surface the researchers behind it.
// ============================================================================

// ---------------------------------------------------------------------------
// OpenAlex — preferred
// ---------------------------------------------------------------------------

interface OaInstitution {
  display_name: string;
  country_code: string | null;
}

interface OaAuthorship {
  author_position: string;
  author: { id: string | null; display_name: string; orcid: string | null };
  institutions: OaInstitution[];
}

interface OaWork {
  id: string;
  display_name: string;
  publication_year: number;
  cited_by_count: number;
  authorships: OaAuthorship[];
  topics?: { display_name: string }[];
  doi?: string | null;
}

async function fromOpenAlex(
  q: ParsedQuery,
  env: Env,
  signal: AbortSignal,
): Promise<DiscoveryItem[]> {
  const terms = q.keywords.slice(0, 5).join(' ').trim();
  if (!terms) return [];

  const filter = [
    `title_and_abstract.search:${terms}`,
    'from_publication_date:2022-01-01',
    'cited_by_count:>15',
  ].join(',');

  const url =
    'https://api.openalex.org/works' +
    `?filter=${encodeURIComponent(filter)}` +
    '&sort=relevance_score:desc&per-page=12' +
    (env.CONTACT_EMAIL ? `&mailto=${encodeURIComponent(env.CONTACT_EMAIL)}` : '');

  const data = await getJSON<{ results?: OaWork[] }>(url, { signal });
  const works = data.results ?? [];

  // One entry per researcher, keeping their strongest paper as evidence.
  const experts = new Map<string, { author: OaAuthorship; work: OaWork }>();
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

  return [...experts.values()].slice(0, 6).map<DiscoveryItem>(({ author, work }) => {
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
}

// ---------------------------------------------------------------------------
// Crossref — fallback
// ---------------------------------------------------------------------------

interface CrAuthor {
  given?: string;
  family?: string;
  affiliation?: { name: string }[];
}

interface CrWork {
  DOI: string;
  title?: string[];
  author?: CrAuthor[];
  issued?: { 'date-parts'?: number[][] };
  'is-referenced-by-count'?: number;
  'container-title'?: string[];
}

async function fromCrossref(
  q: ParsedQuery,
  env: Env,
  signal: AbortSignal,
): Promise<DiscoveryItem[]> {
  const terms = q.keywords.slice(0, 5).join(' ').trim();
  if (!terms) return [];

  const url =
    'https://api.crossref.org/works' +
    `?query=${encodeURIComponent(terms)}` +
    '&rows=20&sort=score&filter=from-pub-date:2022-01-01,type:journal-article';

  // Crossref's polite pool is opt-in via a mailto in the User-Agent, and unlike
  // OpenAlex it grants better service rather than gating access.
  const contact = env.CONTACT_EMAIL ? `; mailto:${env.CONTACT_EMAIL}` : '';
  const data = await getJSON<{ message?: { items?: CrWork[] } }>(url, {
    signal,
    headers: {
      'User-Agent': `STARTVATE/1.0 (+https://github.com/azar-vkn/STARTVATE-App${contact})`,
    },
  });

  const items = data.message?.items ?? [];
  const seen = new Set<string>();
  const out: DiscoveryItem[] = [];

  for (const w of items) {
    const author = w.author?.[0];
    const name = [author?.given, author?.family].filter(Boolean).join(' ').trim();
    const title = w.title?.[0];

    // Crossref returns plenty of records with no attributable author. A mentor
    // card without a name is useless, so skip them rather than pad the section.
    if (!name || !title) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const affiliation = author?.affiliation?.[0]?.name;
    const year = w.issued?.['date-parts']?.[0]?.[0];
    const cites = w['is-referenced-by-count'] ?? 0;
    const journal = w['container-title']?.[0];

    out.push({
      id: itemId('cr', w.DOI),
      kind: 'mentors',
      title: name,
      subtitle: affiliation ? `Researcher · ${clamp(affiliation, 42)}` : 'Domain researcher',
      description: clamp(
        `Published "${title}"${year ? ` (${year})` : ''}${
          cites ? `, cited ${cites} times.` : '.'
        }`,
        190,
      ),
      tags: ['research', ...(journal ? [clamp(journal, 30)] : [])],
      domains: inferDomains(`${title} ${affiliation ?? ''}`),
      stats: cites ? [{ label: 'Cited', value: String(cites) }] : undefined,
      link: `https://doi.org/${w.DOI}`,
      source: 'Crossref',
    });

    if (out.length >= 6) break;
  }

  return out;
}

// ---------------------------------------------------------------------------

export const scholarSource: Source = {
  name: 'scholar',
  ttl: 60 * 60 * 24 * 3, // 3d — the research graph changes slowly

  async fetch(q, env, signal) {
    try {
      const viaOpenAlex = await fromOpenAlex(q, env, signal);
      if (viaOpenAlex.length > 0) return viaOpenAlex;
    } catch (err) {
      // A spent per-IP budget (429) is the common case, but any OpenAlex
      // failure should fall through rather than empty the whole category.
      console.warn('[scholar] OpenAlex unavailable, falling back to Crossref', err);
    }
    return fromCrossref(q, env, signal);
  },
};

/** OpenAlex returns some names as "Last, First" — normalize for display. */
function formatName(name: string): string {
  if (!name.includes(',')) return name;
  const [last, first] = name.split(',').map((s) => s.trim());
  return first ? `${first} ${last}` : last;
}
