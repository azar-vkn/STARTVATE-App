import type { Env } from './types';

// ============================================================================
// Shared helpers: cached fetching, JSON parsing and safe upstream calls.
// ============================================================================

/** Identifies this service to upstream APIs, per their etiquette guidelines. */
export const USER_AGENT =
  'STARTVATE/1.0 (+https://github.com/azar-vkn/STARTVATE-App)';

/** Deterministic cache key for a source + query. */
export async function cacheKey(source: string, input: string): Promise<string> {
  const data = new TextEncoder().encode(`${source}:${input}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `v1:${source}:${hex}`;
}

/**
 * Reads a value from KV, or computes and stores it.
 * Cache failures never break the request — they just mean a fresh fetch.
 */
export async function withCache<T>(
  env: Env,
  key: string,
  ttl: number,
  compute: () => Promise<T>,
): Promise<{ value: T; cached: boolean }> {
  try {
    const hit = await env.CACHE.get(key, 'json');
    if (hit != null) return { value: hit as T, cached: true };
  } catch {
    // Cache read failed — fall through to a live fetch.
  }

  const value = await compute();

  try {
    await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch {
    // Cache write failed — the response is still valid.
  }

  return { value, cached: false };
}

/** GET JSON with a timeout, a UA header and non-2xx treated as an error. */
export async function getJSON<T = unknown>(
  url: string,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${body.slice(0, 140)}`.trim());
  }
  return (await res.json()) as T;
}

/** POST JSON with the same conventions as getJSON. */
export async function postJSON<T = unknown>(
  url: string,
  body: unknown,
  init: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...(init.headers as Record<string, string> | undefined),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text.slice(0, 140)}`.trim());
  }
  return (await res.json()) as T;
}

/** Stable id for a normalized item, so repeated searches keep React keys. */
export function itemId(source: string, raw: string | number): string {
  return `${source}-${String(raw).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)}`;
}

/** Deduplicate items that different sources surfaced for the same entity. */
export function dedupe<T extends { title: string; link?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = (item.link ?? item.title).toLowerCase().replace(/\/+$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
