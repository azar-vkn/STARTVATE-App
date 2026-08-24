# STARTVATE

**The discovery and networking layer for the startup ecosystem.**

When someone has a startup idea, the people, opportunities and information they
need already exist — they're just scattered across LinkedIn, X, Reddit, YC,
Google and a dozen other sites. STARTVATE brings that ecosystem together around
a single search.

---

## What it does

Search once — e.g. `AI Agriculture Startup` — and get the ecosystem organized
around your intent:

| | |
|---|---|
| 🚀 Relevant founders | 🏢 Similar startups & competitors |
| 🤝 Potential co-founders | 🧭 Mentors & experts |
| 💰 Investors | ⚡ Hackathons & competitions |
| 🎟️ Conferences & events | 🌱 Incubators & accelerators |
| 🎯 Grants & funding | 📰 News & signals |
| 💬 Communities | 📚 Resources |

Above the results, an **AI intelligence layer** reads your context and answers
the questions that actually matter: *who should you talk to, which opportunities
fit, which startups should you study, and what are your next steps.*

### Screens

- **Discover** — the search bar at the center, plus example searches, your
  recent searches, and what each category will surface.
- **Results** — AI insight panel followed by horizontally-scrolling category rails.
- **Builder Feed** — posts typed by intent (idea, launch, looking-for-co-founder,
  hiring, progress, question, feedback, opportunity, showcase) with filtering.
- **Ask AI** — secondary deep-guidance chat backed by Claude, for when search
  isn't enough.
- **Builder Profile** — skills, interests, startup & stage, what you're looking
  for, projects, portfolio, location and focus areas — plus appearance settings.

---

## Tech stack

- **React 18 + TypeScript** (strict mode)
- **Vite 5** build
- **Tailwind CSS** with CSS-variable design tokens (light + dark)
- **Zustand** state, persisted via **Capacitor Preferences**
- **Supabase** — Google auth, profiles, posts, likes (Postgres + RLS)
- **Cloudflare Workers + Hono** — the discovery API
- **Capacitor 6** native shell → **Gradle** → Android APK

## Accounts & data

Sign in with **Google**, or tap *Explore without an account* to use the app
anonymously. The two modes are:

| | Signed in | Guest |
|---|---|---|
| Profile & posts | Synced to Supabase, visible to others | On-device only |
| Likes | Shared counts | Local |
| Discovery | Identical | Identical |

Every table has Row Level Security: profiles and posts are publicly readable,
but only ever writable by their owner.

See [`supabase/README.md`](supabase/README.md) for schema and Google OAuth setup.
Without Supabase credentials the app runs in guest mode and skips the login
screen entirely — nothing breaks.

### Theming

Claude palette — coral-orange (`#D9714E`) on warm cream, with a warm-charcoal
dark mode. Theme follows the system setting by default and can be overridden
(Light / Dark / System) from **Profile → Settings**. The choice is applied
before first paint to avoid a flash, and syncs the native status bar.

---

## Project layout

```
src/
  components/   Reusable UI (cards, nav, avatars, theme toggle…)
  screens/      One file per screen
  services/     discoveryService · aiService · apiClient · nlp · storageService
  store/        Zustand stores (app state, theme)
  data/         Category definitions + blank profile default
  types/        Domain models
server/         Cloudflare Worker — the discovery API
  src/sources/  One adapter per upstream source
supabase/
  migrations/   Schema, RLS policies, signup trigger
scripts/
  generate-icons.mjs   Generates launcher icons + splash screens
android/        Capacitor native project
```

---

## Development

```bash
npm install
```

```bash
npm run dev
```

Other useful scripts:

```bash
npm run typecheck
```

```bash
npm run build
```

---

## Building the Android APK

Prerequisites: **Node 18+**, **JDK 17**, **Android SDK** (platform 34,
build-tools 34.0.0).

1. Point Gradle at your SDK — create `android/local.properties`:

   ```
   sdk.dir=C:/Path/To/Android/Sdk
   ```

   > Use forward slashes. Java's `.properties` parser treats backslashes as
   > escape characters and will silently corrupt the path.

2. If your default JDK isn't 17, set it in `android/gradle.properties`:

   ```
   org.gradle.java.home=C:\\Path\\To\\jdk-17
   ```

3. Create a signing keystore and `android/keystore.properties`:

   ```
   storeFile=startvate-release.keystore
   storePassword=…
   keyAlias=startvate
   keyPassword=…
   ```

4. Build:

```bash
npm run android:build
```

The APK lands in `android/app/build/outputs/apk/release/app-release.apk`.

> ⚠️ **Back up the keystore.** Without it you can never publish an update to an
> existing Play Store listing. It is git-ignored by design.

---

## Data

Live results come from the **STARTVATE Discovery API** in [`server/`](server/) —
a Cloudflare Worker that aggregates official sources in parallel:

| Source | Categories | Key needed |
|---|---|---|
| Y Combinator (`yc-oss/api`) | Startups | — |
| GitHub REST API | Co-founders, resources | Optional |
| Hacker News (Algolia) | News, communities | — |
| OpenAlex | Mentors, experts | — |
| Grants.gov | Grants | — |
| Exa | Competitors, events, hackathons, incubators, investors | Required |

See [`server/README.md`](server/README.md) for setup and deployment.

**There is no mock data anywhere in this app.** Every founder, company, mentor,
grant and discussion shown is fetched live from the sources above and carries a
`via <source>` attribution plus a working link.

That is a deliberate product decision, not an omission. Invented results would
be worse than none: a founder could waste real time chasing a company that does
not exist or a grant that was never offered. So when live data is unavailable
the app says so plainly and offers a retry — it never substitutes filler.

| Situation | What the user sees |
|---|---|
| API unreachable | "Could not reach live data" + Retry |
| No API configured | A clear message that this build has no API |
| Some sources failed | Results, plus a banner naming what's missing |
| Genuinely no matches | An empty state suggesting a broader query |
| Feed with no posts | An invitation to write the first one |

Point the app at your deployed Worker before building the APK:

```
VITE_API_BASE_URL=https://startvate-api.YOUR-SUBDOMAIN.workers.dev
```

### A note on LinkedIn

STARTVATE does **not** scrape LinkedIn. Scraping it violates their User
Agreement, gets accounts banned, and — because it collects personal data on
identifiable people — creates real GDPR/DPDP exposure for whoever ships it.

The supported path is **"Sign in with LinkedIn" (OAuth)**, where a user
voluntarily imports *their own* profile into their Builder Profile. That's
permitted, consensual, and produces better data than scraping ever would.

### AI

Two distinct layers, deliberately:

**The insight panel** (`generateInsight`) is deterministic and runs on-device.
It invents nothing — every name, opportunity and competitor it cites is drawn
from the real items the search just returned. It summarises live data rather
than generating claims about it, so it stays accurate and needs no API key.

**Ask AI** is genuinely generative and calls Claude through `POST /api/ask` on
the Worker. If no `ANTHROPIC_API_KEY` is set the endpoint returns 503 and the
app shows an honest "not enabled yet" message — it never falls back to a canned
reply dressed up as a real answer.

> The Anthropic key lives only on the Worker. A provider key shipped inside an
> APK is trivially extractable, so it must never be in the app bundle.

---

## Roadmap

- Real accounts, messaging and connection requests
- Live ecosystem ingestion pipeline
- Semantic (embedding-based) search and personalization
- Push notifications for matched opportunities
- iOS target (`npx cap add ios` — the web layer is already portable)
