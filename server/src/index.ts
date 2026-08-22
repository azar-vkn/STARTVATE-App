import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { Env, Source, SourceReport, DiscoveryItem, SearchResponse } from './types';
import { parseQuery } from './nlp';
import { cacheKey, withCache, dedupe } from './lib';
import { rank } from './rank';

import { githubSource } from './sources/github';
import { ycSource } from './sources/ycombinator';
import { hackerNewsSource } from './sources/hackernews';
import { openAlexSource } from './sources/openalex';
import { grantsSource } from './sources/grants';
import { exaSource } from './sources/exa';

// ============================================================================
// STARTVATE discovery API.
//
// One request fans out to every configured source in parallel, normalizes each
// into DiscoveryItem, merges, de-duplicates and ranks. Sources are independent:
// a slow or failing one is reported and skipped rather than failing the search.
// ============================================================================

const SOURCES: Source[] = [
  ycSource,
  githubSource,
  hackerNewsSource,
  openAlexSource,
  grantsSource,
  exaSource,
];

/** Upper bound for any single source. Workers cap total CPU, not wall time. */
const SOURCE_TIMEOUT_MS = 8000;

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());

// CORS: the packaged app runs from capacitor://, plus localhost in dev.
app.use('/api/*', async (c, next) => {
  const configured = (c.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = configured.length
    ? configured
    : [
        'capacitor://localhost',
        'http://localhost',
        'http://localhost:5173',
        'https://localhost',
      ];

  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : allowed[0]),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    maxAge: 86400,
  })(c, next);
});

app.get('/', (c) =>
  c.json({
    name: 'STARTVATE Discovery API',
    version: '1.0.0',
    endpoints: ['/api/health', '/api/search?q=...'],
  }),
);

app.get('/api/health', (c) => {
  // Report which sources are live so the app can explain gaps to the user.
  const status = SOURCES.map((s) => ({
    name: s.name,
    enabled: s.enabled ? s.enabled(c.env) : true,
  }));
  return c.json({ ok: true, sources: status, time: Date.now() });
});

app.get('/api/search', async (c) => {
  const raw = (c.req.query('q') ?? '').trim();

  if (!raw) return c.json({ error: 'Missing required query parameter "q".' }, 400);
  if (raw.length > 200) return c.json({ error: 'Query too long (max 200 chars).' }, 400);

  const parsed = parseQuery(raw);
  const active = SOURCES.filter((s) => (s.enabled ? s.enabled(c.env) : true));

  const settled = await Promise.all(
    active.map(async (source): Promise<{ report: SourceReport; items: DiscoveryItem[] }> => {
      const started = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

      try {
        const key = await cacheKey(source.name, parsed.raw.toLowerCase());
        const { value, cached } = await withCache(c.env, key, source.ttl, () =>
          source.fetch(parsed, c.env, controller.signal),
        );

        return {
          items: value,
          report: {
            name: source.name,
            ok: true,
            count: value.length,
            ms: Date.now() - started,
            cached,
          },
        };
      } catch (err) {
        return {
          items: [],
          report: {
            name: source.name,
            ok: false,
            count: 0,
            ms: Date.now() - started,
            error: err instanceof Error ? err.message.slice(0, 160) : 'unknown error',
          },
        };
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  const merged = dedupe(settled.flatMap((s) => s.items));
  const items = rank(merged, parsed);

  const body: SearchResponse = {
    query: parsed.raw,
    domains: parsed.domains,
    items,
    sources: settled.map((s) => s.report),
    generatedAt: Date.now(),
  };

  // Let the CDN and client hold onto results briefly; sources are cached in KV
  // for much longer, so this only smooths bursts of identical searches.
  c.header('Cache-Control', 'public, max-age=120');
  return c.json(body);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('[unhandled]', err);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
