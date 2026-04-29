# Nexus Team Hub

Private esports command center for two competitive Valorant teams:

- **Surf'n Bulls** (Norwegian, gold accent)
- **Molgarians** (red accent)

A production-ready Next.js 15 app with Supabase, HenrikDev Valorant stats,
hybrid (rule-based + OpenRouter) AI insights, realtime team chat, match log,
routines, tasks, and a strict Gmail whitelist.

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript strict)
- **Supabase** — Postgres + Auth (Google OAuth) + Row-Level Security + Realtime
- **Tailwind CSS v4** + shadcn/ui primitives (rethemed with gold tokens)
- **Recharts** for stat graphs
- **HenrikDev Valorant API** for player / match / rank data
- **OpenRouter** (free-tier models) for grounded coaching prose
- **Vercel Cron** for stat refresh and insight regeneration

## Folder structure

```
app/
  (auth)/login/                  # team-select + Google OAuth
  (app)/                         # authenticated app shell
    dashboard/
    stats/[name]/[tag]/
    insights/[name]/[tag]/
    matches/, matches/new/, matches/[id]/
    routines/, tasks/, chat/[channel]/
    players/, calendar/
    admin/whitelist/, admin/audit/
  api/
    henrik/...                   # server proxy — key never leaves server
    insights/player/, insights/team/
    matches/, coach-notes/, routines/, tasks/, chat/send/
    admin/whitelist/
    cron/refresh-stats/, cron/regenerate-insights/
  auth/callback/                 # OAuth callback + whitelist gate
components/
  ui/                            # shadcn primitives
  layout/                        # sidebar, topbar, chat-rail
  dashboard/, stats/, insights/, matches/, routines/, tasks/,
  chat/, admin/, common/
lib/
  supabase/{client,server,admin,middleware}
  henrik/{client,cache,normalize,types,regions}
  insights/{engine,llm}
  auth/{get-session,whitelist,rbac}
  audit, utils, constants
types/{domain, database}
supabase/migrations/{0001_init, 0002_rls_policies, 0003_seed}.sql
middleware.ts
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` → `.env.local` and fill in:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# HenrikDev (get a key at https://docs.henrikdev.xyz)
HENRIK_API_KEY=...
HENRIK_REGION_DEFAULT=eu

# OpenRouter free-tier model for AI insight prose
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL=https://github.com/MainTez/Valorant/releases/latest/download/Nexus-Team-Hub-Setup.exe
CRON_SECRET=long-random-string
```

### 3. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Enable Google OAuth in **Auth → Providers**.
   - Authorized redirect URL: `https://<project>.supabase.co/auth/v1/callback`
3. Apply migrations:

```bash
# Option A: Supabase CLI (recommended)
supabase link --project-ref <ref>
supabase db push

# Option B: Copy/paste each file under supabase/migrations/ into the SQL editor
```

4. Update the seed row in `supabase/migrations/0003_seed.sql` if your admin
   email is different from `vegard.laland@gmail.com` (or add it via the
   admin panel after first login).

### 4. Run locally

```bash
npm run dev
# open http://localhost:3000
```

### 5. Run the Windows desktop app locally

```bash
npm run desktop:dev
```

The Electron shell loads `/desktop` from `NEXUS_APP_URL` (defaults to
`http://localhost:3000`) and uses a separate transparent overlay route at
`/desktop/overlay`. The app stays in the Windows tray, starts with Windows,
and shows post-match overlay cards from the `match_moments` feed.

### 6. Download the Windows desktop app from the website

The public `/download` page links to the latest GitHub Releases installer:

```text
https://github.com/MainTez/Valorant/releases/latest/download/Nexus-Team-Hub-Setup.exe
```

Create a desktop release by pushing a tag like `desktop-v0.1.0`. The
`Desktop Release` GitHub Action builds `Nexus-Team-Hub-Setup.exe`, uploads it
to the release, and the website download button starts serving that installer.
Packaged builds load `https://molgarians-premier-hub.vercel.app` by default;
set the repository variable `NEXUS_APP_URL` if production moves to another URL.

## Auth flow

1. User visits `/login` → picks a team → clicks **Sign in with Google**.
2. Google OAuth → `/auth/callback` → the callback checks `whitelist` for the
   returned email.
3. If not whitelisted → session is revoked and the user is redirected back
   with `?error=not_whitelisted`.
4. If whitelisted → `public.users` is upserted with `team_id` + `role`, and
   the user is redirected to `/dashboard`.
5. Middleware enforces session presence on every `(app)/*` route. Admin-only
   routes are gated by the user's role via `requireAdmin()`.
6. Team isolation is enforced at the database layer with Row-Level Security
   on every team-scoped table.

## HenrikDev integration

All Henrik calls go through server-side proxy routes (`/api/henrik/*`).
Responses are cached in a `henrik_cache` table with per-endpoint TTLs
(account 1h, matches 10m, MMR 2m, history 15m). The key never ships to the
browser.

## AI insights

Two-layer design, always grounded:

1. **Rule-based engine** (`lib/insights/engine.ts`) computes momentum,
   consistency, RR trend, win rate, best agents, weak maps, and a
   rank-ladder projection from the last 20 matches. Every data point is
   explicit and logged into `ai_predictions.data_points`.
2. **OpenRouter LLM** (`lib/insights/llm.ts`) receives the engine output
   and writes a 2-3 sentence coach-style summary plus three concrete
   improvement suggestions. The LLM **cannot change** numeric predictions
   — only phrasing. If `OPENROUTER_API_KEY` is missing, the system falls
   back to rule-based text with a "Rules only" badge.

Confidence is derived from `nMatches × consistency × rrTrend stability` and
is always shown alongside the prediction.

## Cron jobs

Configured in `vercel.json`:

- `/api/cron/refresh-stats` — every 6 hours. Pulls the latest Henrik data
  for every tracked `player_profile` and updates the cached snapshot.
- `/api/cron/regenerate-insights` — nightly at 04:00 UTC. Regenerates AI
  predictions for every tracked player.

Both are protected by `CRON_SECRET` via the `Authorization: Bearer …` header.

## Scripts

```bash
npm run dev         # local dev
npm run desktop:dev # Next dev server + Electron shell
npm run desktop:start # Electron shell against NEXUS_APP_URL
npm run desktop:pack  # build Windows NSIS package
npm run build       # production build
npm run start       # start production server
npm run lint        # eslint
npm run type-check  # tsc --noEmit
```

## License

Private. All rights reserved.
