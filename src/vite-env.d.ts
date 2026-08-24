/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the deployed STARTVATE discovery API (Cloudflare Worker).
   * When unset, the app falls back to the bundled curated dataset.
   * e.g. https://startvate-api.<subdomain>.workers.dev
   */
  readonly VITE_API_BASE_URL?: string;

  /** Supabase project URL, e.g. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string;

  /**
   * Supabase *anon* (publishable) key. Public by design — it is safe to ship
   * only because Row Level Security governs every table.
   * Never put the service_role key here; it bypasses RLS.
   */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
