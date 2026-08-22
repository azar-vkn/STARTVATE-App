import type { DiscoveryItem } from '@/types';

// ============================================================================
// Thin client for the STARTVATE discovery API.
//
// The API base URL is injected at build time via VITE_API_BASE_URL so the
// packaged APK points at your deployed Worker. If it is unset, or the network
// is unavailable, callers fall back to the bundled seed dataset — the app
// stays useful offline rather than showing an error.
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
