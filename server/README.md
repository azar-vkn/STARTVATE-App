# STARTVATE Discovery API

A Cloudflare Worker (Hono) that aggregates the startup ecosystem from official
sources and returns normalized, ranked results to the STARTVATE app.

One request fans out to every source in parallel, normalizes each into the
shared `DiscoveryItem` shape, de-duplicates, ranks and caches. **Sources are
independent** — a slow or failing one is reported and skipped rather than
failing the whole search.

## Sources

| Source | Categories | Key | Notes |
|---|---|---|---|
| **Y Combinator** (`yc-oss/api`) | Startups | — | Static JSON on GitHub Pages; can't rate-limit you |
| **GitHub** REST API | Co-founders, resources | Optional | Token lifts 60 → 5,000 req/hr |
| **Hacker News** (Algolia) | News, communities | — | Official, unauthenticated, very stable |
| **OpenAlex** | Mentors, experts | — | CC0 public-domain scholarly graph |
| **Grants.gov** | Grants | — | US federal open funding data |
| **Exa** | Competitors, events, hackathons, incubators, investors | Required | Neural search; source self-disables without a key |

Deliberately excluded: LinkedIn scraping (ToS violation, account bans, GDPR
exposure), Crunchbase (no free tier), Eventbrite (public search removed in
2020), and Reddit's unofficial `.json` endpoints (post-2023 terms).

## Endpoints

```
GET /api/health          → which sources are enabled
GET /api/search?q=...    → { query, domains, items[], sources[], generatedAt }
```

`sources[]` reports per-source `ok`, `count`, `ms`, `cached` and `error`, so the
app can tell the user exactly what's degraded instead of guessing.

## Local development

```bash
npm install
```

Optional keys go in `server/.dev.vars` (git-ignored):

```
GITHUB_TOKEN=ghp_...
EXA_API_KEY=...
```

```bash
npm run dev
```

Then:

```bash
curl "http://localhost:8787/api/search?q=AI+agriculture+startup"
```

## Deploy

First create the KV namespaces and paste the returned ids into `wrangler.toml`:

```bash
npx wrangler kv namespace create CACHE
```

```bash
npx wrangler kv namespace create CACHE --preview
```

Set secrets (each prompts for the value — never commit them):

```bash
npx wrangler secret put GITHUB_TOKEN
```

```bash
npx wrangler secret put EXA_API_KEY
```

Deploy:

```bash
npm run deploy
```

Finally point the app at the deployed Worker in the repo root `.env`, then
rebuild the APK:

```
VITE_API_BASE_URL=https://startvate-api.YOUR-SUBDOMAIN.workers.dev
```

## Caching

Each source caches to Workers KV under its own TTL — 2h for Hacker News, 24h
for the YC dataset, 3d for OpenAlex. Cache failures never break a request; they
just mean a live fetch. Responses also carry `Cache-Control: max-age=120` to
smooth bursts of identical searches.

## Adding a source

Implement the `Source` interface in `src/sources/`, then add it to `SOURCES` in
`src/index.ts`:

```ts
export const mySource: Source = {
  name: 'mysource',
  ttl: 3600,
  enabled: (env) => Boolean(env.MY_API_KEY), // omit if no key needed
  async fetch(query, env, signal) {
    return []; // return DiscoveryItem[]; prefer [] over throwing
  },
};
```

Map results onto the existing `CategoryKey` values so the app renders them
without changes.
