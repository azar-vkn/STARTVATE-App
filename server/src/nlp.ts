import type { ParsedQuery } from './types';

// ============================================================================
// Query understanding — mirrors the app's src/services/nlp.ts so client and
// server classify a query identically.
// ============================================================================

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

/** GitHub topic slugs to search per canonical domain. */
export const DOMAIN_TOPICS: Record<string, string[]> = {
  agriculture: ['agriculture', 'agritech', 'farming'],
  ai: ['machine-learning', 'artificial-intelligence', 'deep-learning'],
  fintech: ['fintech', 'banking'],
  payments: ['payments', 'stripe'],
  healthtech: ['healthcare', 'digital-health'],
  biotech: ['bioinformatics', 'genomics'],
  climate: ['climate-change', 'sustainability'],
  energy: ['energy', 'smart-grid'],
  edtech: ['education', 'edtech'],
  robotics: ['robotics', 'ros'],
  saas: ['saas', 'api'],
  iot: ['iot', 'embedded'],
  mobility: ['logistics', 'transportation'],
  geospatial: ['gis', 'remote-sensing'],
};

const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'to', 'of', 'in', 'on', 'and', 'or', 'with', 'my',
  'startup', 'startups', 'idea', 'ideas', 'company', 'business', 'app', 'build',
  'building', 'want', 'i', 'we', 'about', 'that', 'this', 'find', 'me', 'looking',
]);

export function parseQuery(raw: string): ParsedQuery {
  const lower = raw.toLowerCase();
  const domains = new Set<string>();

  for (const [domain, triggers] of Object.entries(DOMAIN_LEXICON)) {
    if (triggers.some((t) => lower.includes(t))) domains.add(domain);
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

/** Infer canonical domains from an arbitrary blob of upstream text. */
export function inferDomains(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const [domain, triggers] of Object.entries(DOMAIN_LEXICON)) {
    if (triggers.some((t) => lower.includes(t))) out.push(domain);
  }
  return out;
}

/** Trim upstream prose to a card-sized summary without cutting mid-word. */
export function clamp(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
}
