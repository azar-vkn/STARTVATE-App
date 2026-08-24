# Supabase setup

STARTVATE uses Supabase for authentication (Google) and for storing profiles,
projects, posts, likes and comments.

If these steps aren't done, the app still runs — it falls back to **local guest
mode**, where everything persists on-device only and the login screen is
skipped. Nothing breaks; it just isn't synced or shared.

---

## 1. Create the project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Note your **Project URL** and **anon / publishable key** from
   *Project Settings → API*.

> Ship only the **anon** key. It is public by design and safe precisely because
> Row Level Security governs every table. **Never** put the `service_role` key
> in the app — it bypasses RLS entirely and would expose every user's data.

## 2. Create the schema

Open *SQL Editor* in the dashboard, paste the contents of
[`migrations/0001_init.sql`](migrations/0001_init.sql), and run it.

Or with the CLI:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

```bash
npx supabase db push
```

This creates `profiles`, `projects`, `posts`, `post_likes`, `post_comments`,
the `feed_posts` view, RLS policies on everything, and a trigger that
auto-creates a profile on signup (seeded with the user's Google name and
avatar).

## 3. Google OAuth — Google Cloud side

In [console.cloud.google.com](https://console.cloud.google.com) →
*APIs & Services → Credentials*:

**a. Configure the OAuth consent screen.** External, add app name and support
email. While the app is in "Testing", only accounts you list as test users can
sign in — publish it when you're ready for real users.

**b. Create a Web application OAuth client.** Add this Authorized redirect URI:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Copy the **Client ID** and **Client secret**.

**c. Create an Android OAuth client** (recommended — hardens the flow):

| Field | Value |
|---|---|
| Package name | `com.startvate.app` |
| SHA-1 (release keystore) | `64:AC:87:2A:66:24:B0:60:CA:83:98:A1:86:92:9A:CF:A8:86:4C:BB` |

Regenerate that fingerprint any time with:

```bash
keytool -list -v -keystore android/startvate-release.keystore -alias startvate
```

> If you build debug APKs, also register the debug keystore's SHA-1
> (`~/.android/debug.keystore`, password `android`) — it's a different key.

## 4. Google OAuth — Supabase side

*Authentication → Providers → Google*: enable it and paste the **Web** client ID
and secret from step 3b.

Then *Authentication → URL Configuration → Redirect URLs*, add:

```
com.startvate.app://auth/callback
```

This must match `REDIRECT_URL` in `src/services/authService.ts` and the
`<data android:scheme="com.startvate.app" android:host="auth" />` intent filter
in `AndroidManifest.xml`. All three have to agree or the callback is dropped.

## 5. Point the app at your project

Create `.env` in the repo root:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then rebuild:

```bash
npm run android:build
```

---

## How the Google flow actually works

Google **refuses OAuth from embedded WebViews** (`disallowed_useragent`) — an
anti-phishing measure. A Capacitor app *is* a WebView, so signing in inline is
impossible by design. The app therefore:

1. Asks Supabase for the provider URL (`skipBrowserRedirect: true`)
2. Opens it in the **system browser** (Chrome Custom Tabs), which Google accepts
3. Receives `com.startvate.app://auth/callback?code=…` back via the intent filter
4. Exchanges the PKCE code for a session
5. Closes the browser tab

On web there is no WebView restriction, so the ordinary redirect flow is used.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `disallowed_useragent` | Auth was attempted in the WebView instead of the system browser |
| Browser opens, nothing comes back | Redirect URL missing from Supabase's allow-list, or the intent filter scheme doesn't match |
| `redirect_uri_mismatch` | The Supabase callback URI isn't in the Google **Web** client |
| Signs in, but profile is empty | The `on_auth_user_created` trigger didn't run — re-run the migration |
| Works in debug, fails in release | The release keystore's SHA-1 isn't registered in the Android OAuth client |
