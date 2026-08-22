import type { Source, DiscoveryItem } from '../types';
import { clamp, inferDomains } from '../nlp';
import { postJSON, itemId } from '../lib';

// ============================================================================
// Grants.gov — the US federal funding opportunity database.
// Public, documented `search2` endpoint. No key required.
//
// Yields real, currently-open non-dilutive funding as `grants`.
//
// (SBIR.gov's public API now returns 403 to non-browser clients, so Grants.gov
// is the reliable federal source — it also indexes SBIR/STTR solicitations.)
// ============================================================================

interface OppHit {
  id: string;
  number: string;
  title: string;
  agencyCode: string;
  agency: string;
  openDate: string;
  closeDate: string;
  oppStatus: string;
  docType: string;
  cfdaList?: string[];
}

interface Search2Response {
  errorcode: number;
  data?: { hitCount: number; oppHits?: OppHit[] };
}

const ENDPOINT = 'https://api.grants.gov/v1/api/search2';

export const grantsSource: Source = {
  name: 'grants',
  ttl: 60 * 60 * 12, // 12h — postings update daily at most

  async fetch(q, _env, signal) {
    const keyword = q.keywords.slice(0, 4).join(' ').trim();
    if (!keyword) return [];

    const res = await postJSON<Search2Response>(
      ENDPOINT,
      {
        keyword,
        // Only opportunities you can still act on.
        oppStatuses: 'forecasted|posted',
        rows: 10,
      },
      { signal },
    );

    if (res.errorcode !== 0) return [];
    const hits = res.data?.oppHits ?? [];

    return hits
      .filter((h) => h.title && !isExpired(h.closeDate))
      .slice(0, 6)
      .map<DiscoveryItem>((h) => ({
        id: itemId('grant', h.id),
        kind: 'grants',
        title: clamp(h.title, 80),
        subtitle: clamp(h.agency || h.agencyCode, 48),
        description: clamp(
          `Federal ${h.oppStatus === 'forecasted' ? 'forecasted' : 'open'} funding opportunity (${h.number}). Non-dilutive capital for qualifying work in this area.`,
          190,
        ),
        tags: ['non-dilutive', h.oppStatus, ...(h.cfdaList ?? []).slice(0, 1)],
        domains: inferDomains(`${h.title} ${h.agency}`),
        location: 'United States',
        stats: [
          ...(h.closeDate ? [{ label: 'Closes', value: h.closeDate }] : []),
        ],
        link: `https://www.grants.gov/search-results-detail/${h.id}`,
        source: 'Grants.gov',
      }));
  },
};

/** closeDate arrives as MM/DD/YYYY; drop anything already past. */
function isExpired(closeDate: string): boolean {
  if (!closeDate) return false; // no deadline stated — keep it
  const [m, d, y] = closeDate.split('/').map(Number);
  if (!m || !d || !y) return false;
  return new Date(y, m - 1, d).getTime() < Date.now();
}
