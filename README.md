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

- **Discover** — the search bar at the center, plus trending searches, recent
  searches and a story row of builders.
- **Results** — AI insight panel followed by horizontally-scrolling category rails.
- **Builder Feed** — posts typed by intent (idea, launch, looking-for-co-founder,
  hiring, progress, question, feedback, opportunity, showcase) with filtering.
- **Ask AI** — secondary deep-guidance chat, for when search isn't enough.
- **Builder Profile** — skills, interests, startup & stage, what you're looking
  for, projects, portfolio, location and focus areas — plus appearance settings.

---

## Tech stack

- **React 18 + TypeScript** (strict mode)
- **Vite 5** build
- **Tailwind CSS** with CSS-variable design tokens (light + dark)
- **Zustand** state, persisted via **Capacitor Preferences**
- **Capacitor 6** native shell → **Gradle** → Android APK

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
  services/     discoveryService · aiService · nlp · storageService
  store/        Zustand stores (app state, theme)
  data/         Seed ecosystem dataset + categories
  types/        Domain models
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

## Where real data and real AI plug in

The app ships fully self-contained and offline-capable. Two documented seams are
where a production deployment swaps in live systems — the UI depends only on the
returned shapes, so nothing else changes:

- **`src/services/discoveryService.ts` → `search()`**
  Replace the ranked seed dataset with your aggregation backend (a search index
  over LinkedIn / Crunchbase / YC / event & grant sources).

- **`src/services/aiService.ts` → `generateInsight()` and `askAI()`**
  Replace the heuristics with Claude API calls. The file contains a worked
  `callLLM` example.

  > Never ship a provider API key inside a mobile bundle — proxy the call
  > through your own backend.

---

## Roadmap

- Real accounts, messaging and connection requests
- Live ecosystem ingestion pipeline
- Semantic (embedding-based) search and personalization
- Push notifications for matched opportunities
- iOS target (`npx cap add ios` — the web layer is already portable)
