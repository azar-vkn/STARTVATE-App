/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the deployed STARTVATE discovery API (Cloudflare Worker).
   * When unset, the app falls back to the bundled curated dataset.
   * e.g. https://startvate-api.<subdomain>.workers.dev
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
