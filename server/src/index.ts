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
import { callClaude, claudeConfigured, ADVISOR_SYSTEM, ClaudeUnavailableError } from './claude';

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
  return c.json({
    ok: true,
    sources: status,
    ask: claudeConfigured(c.env),
    time: Date.now(),
  });
});

/**
 * Ask AI — deeper conversational guidance, answered by Claude.
 *
 * Returns 503 when no key is configured rather than inventing a canned reply:
 * the app would otherwise present a template as if it were a real answer.
 */
app.post('/api/ask', async (c) => {
  if (!claudeConfigured(c.env)) {
    return c.json(
      { error: 'Ask AI is not configured on this deployment.', code: 'not-configured' },
      503,
    );
  }

  let body: { question?: unknown; history?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return c.json({ error: 'Missing "question".' }, 400);
  if (question.length > 2000) return c.json({ error: 'Question too long.' }, 400);

  // Trust only the shape, not the contents: cap how much history we replay.
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is { role: 'user' | 'assistant'; content: string } =>
            !!m &&
            typeof m === 'object' &&
            (m as { role?: unknown }).role !== undefined &&
            ((m as { role: unknown }).role === 'user' ||
              (m as { role: unknown }).role === 'assistant') &&
            typeof (m as { content?: unknown }).content === 'string',
        )
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    : [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const answer = await callClaude(
      c.env,
      ADVISOR_SYSTEM,
      [...history, { role: 'user' as const, content: question }],
      controller.signal,
    );
    return c.json({ answer, model: 'claude-sonnet-5' });
  } catch (err) {
    console.error('[ask] failed', err);
    const message =
      err instanceof ClaudeUnavailableError
        ? 'Ask AI is temporarily unavailable.'
        : 'Ask AI request failed.';
    return c.json({ error: message, code: 'upstream' }, 502);
  } finally {
    clearTimeout(timer);
  }
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
