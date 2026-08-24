import type { DiscoveryItem } from '@/types';

// ============================================================================
// Thin client for the STARTVATE discovery API.
//
// The API base URL is injected at build time via VITE_API_BASE_URL so the
// packaged APK points at your deployed Worker. If it is unset or unreachable,
// callers surface a clear error — the app never substitutes invented data.
// ============================================================================

export interface SourceReport {
  name: string;
  ok: boolean;
  count: number;
  ms: number;
  error?: string;
  cached?: boolean;
}

export interface ApiSearchResponse {
  query: string;
  domains: string[];
  items: DiscoveryItem[];
  sources: SourceReport[];
  generatedAt: number;
}

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/** Whole-request budget. The server races its own per-source timeouts inside. */
const REQUEST_TIMEOUT_MS = 15000;

export const isApiConfigured = (): boolean => BASE_URL.length > 0;

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export async function searchApi(query: string): Promise<ApiSearchResponse> {
  if (!BASE_URL) {
    throw new ApiUnavailableError('No API base URL configured.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new ApiUnavailableError(`Discovery API returned ${res.status}.`);
    }

    const data = (await res.json()) as ApiSearchResponse;
    if (!Array.isArray(data.items)) {
      throw new ApiUnavailableError('Malformed response from discovery API.');
    }
    return data;
  } catch (err) {
    if (err instanceof ApiUnavailableError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiUnavailableError('Discovery API timed out.');
    }
    throw new ApiUnavailableError(
      err instanceof Error ? err.message : 'Could not reach the discovery API.',
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Raised when Ask AI is unavailable, with a reason the UI can act on. */
export class AskUnavailableError extends Error {
  readonly reason: 'not-configured' | 'offline' | 'upstream';

  constructor(reason: 'not-configured' | 'offline' | 'upstream', message: string) {
    super(message);
    this.name = 'AskUnavailableError';
    this.reason = reason;
  }
}

export interface AskMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Ask AI, answered by Claude on the Worker. Never returns canned text. */
export async function askApi(
  question: string,
  history: AskMessage[],
): Promise<string> {
  if (!BASE_URL) {
    throw new AskUnavailableError(
      'not-configured',
      'Ask AI needs the STARTVATE API. This build has none configured.',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(`${BASE_URL}/api/ask`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ question, history }),
    });

    if (res.status === 503) {
      throw new AskUnavailableError(
        'not-configured',
        'Ask AI is not enabled on this deployment yet.',
      );
    }
    if (!res.ok) {
      throw new AskUnavailableError('upstream', 'Ask AI is temporarily unavailable.');
    }

    const data = (await res.json()) as { answer?: string };
    if (!data.answer) {
      throw new AskUnavailableError('upstream', 'Ask AI returned an empty answer.');
    }
    return data.answer;
  } catch (err) {
    if (err instanceof AskUnavailableError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AskUnavailableError('offline', 'Ask AI timed out. Please try again.');
    }
    throw new AskUnavailableError('offline', 'Could not reach Ask AI. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}
