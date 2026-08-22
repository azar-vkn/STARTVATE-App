// ============================================================================
// Lightweight query understanding.
// Maps a free-text search like "AI Agriculture Startup" into canonical domains
// and salient keywords. In production this is where an LLM / embedding model
// would classify intent; here we use a transparent keyword lexicon so results
// are deterministic and explainable.
// ============================================================================

/** canonical domain -> synonyms/triggers */
const DOMAIN_LEXICON: Record<string, string[]> = {
  agriculture: [
    'agri', 'agriculture', 'agritech', 'farm', 'farming', 'crop', 'soil',
    'harvest', 'agronomy', 'food', 'irrigation', 'livestock',
  ],
  ai: ['ai', 'artificial intelligence', 'ml', 'machine learning', 'llm', 'agent', 'genai', 'model', 'vision', 'nlp'],
  fintech: ['fintech', 'finance', 'banking', 'bank', 'lending', 'credit', 'wallet', 'neobank'],
  payments: ['payments', 'payment', 'pay', 'checkout', 'billing', 'transactions'],
  healthtech: ['health', 'healthtech', 'medical', 'clinical', 'patient', 'care', 'medtech', 'wellness'],
  biotech: ['biotech', 'bio', 'genomics', 'diagnostics', 'drug', 'pharma'],
  climate: ['climate', 'sustainability', 'carbon', 'green', 'environment', 'adaptation'],
  energy: ['energy', 'battery', 'grid', 'solar', 'power', 'ev', 'charging'],
  edtech: ['edtech', 'education', 'learning', 'tutor', 'school', 'student', 'course'],
  robotics: ['robot', 'robotics', 'automation', 'drone', 'hardware', 'embedded'],
  saas: ['saas', 'software', 'b2b', 'platform', 'api', 'tool', 'productivity'],
  iot: ['iot', 'sensor', 'sensors', 'device', 'devices', 'connected'],
  mobility: ['mobility', 'transport', 'logistics', 'fleet', 'vehicle', 'delivery'],
  geospatial: ['satellite', 'geospatial', 'mapping', 'gis', 'imagery'],
};

const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'and', 'or', 'with', 'my',
  'startup', 'startups', 'idea', 'ideas', 'company', 'business', 'app', 'build',
  'building', 'want', 'i', 'we', 'about', 'that', 'this', 'find', 'me', 'looking',
]);

export interface ParsedQuery {
  raw: string;
  keywords: string[];
  domains: string[];
}

export function parseQuery(raw: string): ParsedQuery {
  const lower = raw.toLowerCase();
  const domains = new Set<string>();

  for (const [domain, triggers] of Object.entries(DOMAIN_LEXICON)) {
    if (triggers.some((t) => lower.includes(t))) {
      domains.add(domain);
    }
  }

  const keywords = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));

  return {
    raw: raw.trim(),
    keywords: Array.from(new Set(keywords)),
    domains: Array.from(domains),
  };
}

/** Human-friendly label for a canonical domain. */
export function domainLabel(domain: string): string {
  const labels: Record<string, string> = {
    agriculture: 'Agriculture',
    ai: 'AI',
    fintech: 'Fintech',
    payments: 'Payments',
    healthtech: 'Health',
    biotech: 'Biotech',
    climate: 'Climate',
    energy: 'Energy',
    edtech: 'Education',
    robotics: 'Robotics',
    saas: 'SaaS',
    iot: 'IoT',
    mobility: 'Mobility',
    geospatial: 'Geospatial',
  };
  return labels[domain] ?? domain.charAt(0).toUpperCase() + domain.slice(1);
}
