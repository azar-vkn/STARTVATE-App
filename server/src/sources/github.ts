import type { Source, DiscoveryItem } from '../types';
import { DOMAIN_TOPICS, clamp, inferDomains } from '../nlp';
import { getJSON, itemId } from '../lib';

// ============================================================================
// GitHub — official REST API.
//
// Surfaces two things from public data:
//   • Repositories in the domain  -> `resources` (projects worth studying)
//   • Their maintainers           -> `cofounders` (active builders in the space)
//
// Only public profile fields are used, exactly as the API returns them.
// A token is optional but lifts the rate limit from 60 to 5,000 req/hour.
// ============================================================================

interface GhRepo {
  id: number;
  full_name: string;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  owner: { login: string; type: string; html_url: string };
  pushed_at: string;
}

interface GhUser {
  login: string;
  name: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  hireable: boolean | null;
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/**
 * Build a GitHub search query.
 *
 * Two GitHub search behaviours drive this shape:
 *   1. Repeated qualifiers are ANDed — `topic:a topic:b` needs a repo with
 *      *both*, which almost never matches. So we use one topic only.
 *   2. Free-text terms are also ANDed — "ai farming robotics" requires all
 *      three words and reliably returns zero. So we join keywords with OR.
 */
function repoQuery(domains: string[], keywords: string[]): string {
  const primaryTopic = domains.map((d) => DOMAIN_TOPICS[d]?.[0]).find(Boolean);
  const terms = keywords.slice(0, 3).join(' OR ');
  const parts = [terms, primaryTopic ? `topic:${primaryTopic}` : ''].filter(Boolean);
  if (parts.length === 0) return '';
  // Only reasonably healthy, recently-active projects.
  return `${parts.join(' ')} stars:>25 pushed:>2024-06-01`;
}

/** Broader retry for niche queries where the topic filter is too narrow. */
function fallbackQuery(keywords: string[]): string {
  const terms = keywords.slice(0, 3).join(' OR ');
  return terms ? `${terms} stars:>100 pushed:>2024-06-01` : '';
}

export const githubSource: Source = {
  name: 'github',
  ttl: 60 * 60 * 6, // 6h — repo stats move slowly

  async fetch(q, env, signal) {
    const token = env.GITHUB_TOKEN;

    const runSearch = async (search: string): Promise<GhRepo[]> => {
      if (!search) return [];
      const url =
        'https://api.github.com/search/repositories?q=' +
        encodeURIComponent(search) +
        '&sort=stars&order=desc&per_page=12';
      const data = await getJSON<{ items?: GhRepo[] }>(url, {
        headers: headers(token),
        signal,
      });
      return (data.items ?? []).filter((r) => r.description);
    };

    // A topic-scoped search is more precise but can come back empty; fall back
    // to plain terms so a niche query still returns something useful.
    let repos = await runSearch(repoQuery(q.domains, q.keywords));
    if (repos.length === 0) {
      repos = await runSearch(fallbackQuery(q.keywords));
    }
    if (repos.length === 0) return [];

    const items: DiscoveryItem[] = repos.slice(0, 8).map((r) => ({
      id: itemId('gh-repo', r.id),
      kind: 'resources',
      title: r.name,
      subtitle: r.language ? `${r.language} · open source` : 'Open source project',
      description: clamp(r.description ?? ''),
      tags: (r.topics ?? []).slice(0, 5),
      domains: inferDomains(`${r.full_name} ${r.description} ${(r.topics ?? []).join(' ')}`),
      stats: [
        { label: '★', value: formatCount(r.stargazers_count) },
        { label: 'Forks', value: formatCount(r.forks_count) },
      ],
      link: r.html_url,
      source: 'GitHub',
    }));

    // Fetch the maintainers behind the strongest projects, in parallel.
    const owners = [...new Set(repos.filter((r) => r.owner.type === 'User').map((r) => r.owner.login))].slice(0, 5);

    const users = await Promise.all(
      owners.map(async (login) => {
        try {
          return await getJSON<GhUser>(`https://api.github.com/users/${login}`, {
            headers: headers(token),
            signal,
          });
        } catch {
          return null; // one bad profile shouldn't sink the batch
        }
      }),
    );

    for (const u of users) {
      if (!u || (!u.bio && !u.name)) continue;
      items.push({
        id: itemId('gh-user', u.login),
        kind: 'cofounders',
        title: u.name || u.login,
        subtitle: u.company ? `Builder · ${u.company}` : 'Open-source builder',
        description: clamp(u.bio ?? `Maintains open-source projects in this space.`),
        tags: [u.hireable ? 'open-to-work' : 'builder', 'github'].filter(Boolean),
        domains: inferDomains(`${u.bio ?? ''} ${u.company ?? ''}`),
        location: u.location ?? undefined,
        stats: [
          { label: 'Followers', value: formatCount(u.followers) },
          { label: 'Repos', value: String(u.public_repos) },
        ],
        link: u.html_url,
        source: 'GitHub',
      });
    }

    return items;
  },
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}
