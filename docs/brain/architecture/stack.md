---
tags: [architecture, stack]
created: 2026-04-21
---

# Stack

One paragraph per layer. Canonical configs: [`package.json`](../../package.json), [`tsconfig.json`](../../tsconfig.json), [`next.config.mjs`](../../next.config.mjs), [`tailwind.config.ts`](../../tailwind.config.ts), [`vercel.json`](../../vercel.json).

## Runtime

**Next.js 15.1.6 App Router** on **React 19** with **TypeScript 5.7 strict**. Runs as a Vercel deployment (Node-ish serverless for route handlers, Edge runtime for `middleware.ts`). Path alias `@/*` maps to the repo root.

## Persistence

**Supabase** (managed Postgres + Auth + Realtime + Storage) — accessed via `@supabase/ssr` (server-rendered helpers) and `@supabase/supabase-js` (service-role admin). Schema under `supabase/migrations/0001_init.sql`, RLS policies in `0002_rls_policies.sql`, seed in `0003_seed.sql`. Migrations are applied via the Supabase CLI (`supabase db push`) or pasted into the SQL editor. No ORM — raw queries via the Supabase client.

## Auth

**Supabase Auth** with **Google OAuth** as the sole provider. Session cookies managed by `@supabase/ssr`. The `public.users` table mirrors `auth.users` with team + role + Riot identity. A Gmail whitelist table gates sign-in; `/auth/callback/route.ts` is the enforcement point — non-whitelisted users are signed out and their `auth.users` row is deleted via service-role. See [[0003-team-isolation-via-supabase-rls]] for the RLS enforcement layer.

## External services

- **HenrikDev Valorant API** — player accounts, match history, MMR, MMR history. Wrapped in `lib/henrik/` and exposed via proxy routes at `app/api/henrik/*`. Responses cached in the `henrik_cache` table (see [[0004-henrik-proxy-cache-strategy]]). Key never leaves the server.
- **OpenRouter** — free-tier LLM (default `meta-llama/llama-3.1-8b-instruct:free`) for the coach-summary prose in AI insights. Called from `lib/insights/llm.ts` with a 12-second abort timeout. Degrades to rules-only prose when `OPENROUTER_API_KEY` is missing. See [[0001-hybrid-ai-insights-engine]] and [[0002-openrouter-over-openai]].
- **Google OAuth** (via Supabase Auth provider config) — sole sign-in method.
- **Vercel Cron** — scheduled endpoints `/api/cron/refresh-stats` (every 6h) and `/api/cron/regenerate-insights` (daily 04:00 UTC). Gated by a `CRON_SECRET` bearer token.

## Key libraries

- `@supabase/ssr` + `@supabase/supabase-js` — server/client/admin Supabase clients in `lib/supabase/`.
- `@radix-ui/react-*` — primitives (dialog, dropdown, tabs, toast, tooltip, progress, select, avatar, label, scroll-area, slot).
- `tailwindcss@4` + `@tailwindcss/postcss` — styling. shadcn-style primitives live in `components/ui/`.
- `recharts` — stat graphs.
- `lucide-react` — icons.
- `zod` — API-boundary validation.
- `date-fns` — date formatting.
- `class-variance-authority` + `clsx` + `tailwind-merge` — variant/classname utilities.

## Deployment

Vercel. Cron schedule in `vercel.json`. Env vars required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `HENRIK_API_KEY`, `HENRIK_REGION_DEFAULT`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_APP_URL`, `OPENROUTER_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`. See [`.env.example`](../../.env.example).

## What's intentionally NOT in the stack

- **No ORM** (Prisma / Drizzle). Direct Supabase client calls. Simpler, integrates with RLS without a generated-types roundtrip.
- **No OpenAI / Anthropic SDK** — OpenRouter free-tier was explicitly preferred. See [[0002-openrouter-over-openai]].
- **No separate backend service** — Next.js route handlers are the only server. No queue/worker yet (cron does the batch work).
- **No generated Supabase types** — `types/database.ts` is a placeholder `Record<string, unknown>`. `supabase gen types` will be wired up later. This is why the Supabase clients don't pass a `<Database>` generic (was causing `never` inference); row typing happens at call-sites via `types/domain.ts`.
- **No tests, no CI, no Storybook** — all deferred (see [[status]]).
- **No image assets** — team emblems are CSS-only.
