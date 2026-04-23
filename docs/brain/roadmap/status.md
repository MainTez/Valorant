---
tags: [roadmap, status]
created: 2026-04-21
updated: 2026-04-23
---

# Status

Snapshot of what's shipped / stubbed / missing right now. Grouped by area. Update this whenever the answer changes — it's only useful if it matches reality.

## Auth & access control

- ✅ Login page at `app/(auth)/login/` with team-select cards, Google OAuth, and a VIP login shortcut reserved for AI-agent testing.
- ✅ `/auth/callback/route.ts` exchanges Google/OTP callbacks, checks `whitelist`, upserts `public.users`, logs a `signin` audit row, and rejects selected-team mismatches.
- ✅ `middleware.ts` gates `/(app)/*`; public paths = `/login`, `/auth/*`, `/api/auth/*`, `/api/cron/*`, and `/favicon.ico`.
- ✅ `lib/auth/get-session.ts` provides `getSessionUser` (cached), `requireSession`, `requireAdmin`, `requireCoachOrAdmin`.
- ✅ VIP login route `/api/auth/vip-login` exists specifically for AI-agent testing: it seeds deterministic per-team admin users, signs them into a normal Supabase auth session, and reuses the existing RLS model.
- ✅ Team isolation via Postgres RLS — every team-scoped table, helper functions `current_team_id() / current_role() / is_admin() / is_coach_or_admin()`. See [[0003-team-isolation-via-supabase-rls]].

## Data & integrations

- ✅ Supabase schema is versioned in migrations `0001_init.sql`, `0002_rls_policies.sql`, `0003_seed.sql`, and `0005_match_vod_uploads.sql`.
- ✅ Seed creates two teams, six default chat channels per team, one "Daily practice" routine per team, and a "Mid Control" weekly-focus team note. Admin whitelist entries for `vegard.laland@gmail.com` and `danilebnen@gmail.com` → Surf'n Bulls.
- ✅ HenrikDev wrapper in `lib/henrik/` (client, cache, normalize, regions, types) with proxy routes at `app/api/henrik/{account,matches,mmr,mmr-history}`.
- ✅ `henrik_cache` table with per-endpoint TTLs (1h / 10m / 2m / 15m). See [[0004-henrik-proxy-cache-strategy]].
- ✅ Match VOD uploads use private Supabase Storage objects behind app-issued signed upload/download URLs. Metadata lives on `matches.vod_*`; the bucket is `match-vods`. Playback metadata now flows through `/api/matches/[id]/vod/playback`. See [[0005-private-match-vod-uploads]] and [[0006-in-app-vod-library-and-playback]].
- ⚠️ `types/database.ts` is a placeholder `Record<string, unknown>`. Supabase clients skip the `<Database>` generic to avoid `never` inference. `supabase gen types` is pending.
- ⚠️ No live Supabase project is wired up yet — migrations are written but not applied against a real instance.

## AI insights

- ✅ Rule-based engine in `lib/insights/engine.ts` — momentum, consistency, RR trend, win rate, best agents, weak maps, rank-ladder projection from last 20 matches.
- ✅ OpenRouter wrapper in `lib/insights/llm.ts` — strict system prompt, JSON-only, 12s timeout, rules-only fallback when `OPENROUTER_API_KEY` is missing. See [[0001-hybrid-ai-insights-engine]] and [[0002-openrouter-over-openai]].
- ✅ Predictions persisted in `ai_predictions` with `llm_used` flag and `data_points` JSONB.

## UI (authenticated app)

- ✅ `/dashboard` — team overview.
- ✅ `/stats/[name]/[tag]` — player stats with Recharts graphs.
- ✅ `/insights/[name]/[tag]` — AI insight report with confidence + rules/LLM badge.
- ✅ `/matches`, `/matches/new`, `/matches/[id]` — match log with coach notes, delete controls, private MP4 VOD uploads, and inline playback.
- ✅ `/vods` and `/vods/[id]` — dedicated VOD library and playback pages.
- ✅ `/routines` — daily routine with progress rings.
- ✅ `/tasks` — kanban (backlog / in_progress / done).
- ✅ `/chat/[channel]` — per-channel realtime chat via Supabase Realtime.
- ✅ `/players` — team roster.
- ✅ `/calendar` — list view of `schedule_events` (read-only).
- ✅ `/admin/whitelist` and `/admin/audit` — admin-only, gated by `requireAdmin()`.
- ✅ Dark premium theme with per-team accent via `[data-team]` (`surf-n-bulls` gold, `molgarians` red).
- ⚠️ Calendar is list-only — no create-event form. Events must be seeded via Supabase directly.
- ⚠️ Players page has no Riot-ID link UI. Users still edit `users.riot_name` / `users.riot_tag` in the DB.
- ⚠️ Match VODs are limited to one MP4 upload or one external link per match. There is now an in-app player and VOD library, but still no transcoding, clips, playlists, or timeline comments.
- ⚠️ Top-bar notification bell is decorative; no notifications panel.
- ⚠️ `⌘K` command-palette hint in UI is a visual only; no palette implemented.

## Infrastructure

- ✅ `vercel.json` cron: `/api/cron/refresh-stats` daily at 03:00 UTC (`0 3 * * *`); `/api/cron/regenerate-insights` daily at 04:00 UTC. Vercel Hobby plan caps crons at once per day — a sub-daily schedule (originally `0 */6 * * *`) fails deployment with *"Hobby accounts are limited to daily cron jobs."*
- ✅ `CRON_SECRET` bearer-token gating on `/api/cron/*` routes.
- ⚠️ No Vercel deployment yet; env vars not wired in prod.
- ⚠️ Google OAuth client not yet configured (Supabase redirect URL pending real project).

## Testing / tooling

- ⚠️ Minimal `node:test` coverage exists via `npm test` for `lib/vods.ts` and `lib/auth/public-paths.ts`; the app still lacks a broader test suite.
- ❌ No CI pipeline.
- ❌ No Storybook.
- ❌ No mobile/tablet responsive polish (desktop-first per spec).
- ❌ No image assets / team logos — CSS-only emblems today.

See [[next-up]] for ordered work and [[open-questions]] for undecided choices.
