# Deployment Guide

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in these required values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
HENRIK_API_KEY=...
HENRIK_REGION_DEFAULT=eu
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_APP_URL=http://localhost:3000
OPENROUTER_APP_NAME=RankTerminal
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=long-random-string
```

3. Apply the SQL migrations in `supabase/migrations/`.

```bash
supabase link --project-ref <ref>
supabase db push
```

4. In Supabase Auth:
   - enable Google under `Auth -> Providers`
   - set `Site URL` to `http://localhost:3000`
   - add `http://localhost:3000/auth/callback` as a redirect URL

5. Start the app:

```bash
npm install
npm run dev
```

## Vercel setup

1. Import the repo into Vercel.
2. Add the same environment variables used locally.
3. Override these values for production:

```env
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>
OPENROUTER_APP_URL=https://<your-vercel-domain>
CRON_SECRET=<same-random-secret-used-in-vercel>
```

4. In Supabase Auth URL configuration, add:
   - set `Site URL` to `https://<your-vercel-domain>`
   - `https://<your-vercel-domain>/auth/callback`

5. In Google OAuth, add your Vercel domain to the allowed origins and redirect URIs used by Supabase.
6. Deploy once and confirm the cron jobs from `vercel.json` appear in the Vercel dashboard.

## Verification

Run these before pushing:

```bash
npm run type-check
npm run lint
npm run build
```

The repo now uses `next typegen && tsc --noEmit` for `npm run type-check`, so type checking works on a clean clone without requiring a prior build.

## Google OAuth redirect note

If Google sends you back to `http://localhost:3000` from a deployed app, Supabase is falling back to its configured `Site URL`.

Check these exact settings in Supabase:

- `Auth -> URL Configuration -> Site URL` must be your deployed app URL in production
- `Auth -> URL Configuration -> Redirect URLs` must include `https://<your-vercel-domain>/auth/callback`
- if you previously allowed a callback URL with query params, remove that dependency; the app now always uses the plain `/auth/callback` URL
