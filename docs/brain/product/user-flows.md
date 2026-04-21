---
tags: [product, flows]
created: 2026-04-21
---

# User Flows

Primary journeys through Nexus Team Hub. One section per flow. Code-level detail belongs in architecture notes.

## First-time sign-in (whitelist gate)

1. User lands on `/login` — a team-select landing with two cards (Surf'n Bulls / Molgarians) and a **Sign in with Google** button.
2. User picks a team card and clicks sign-in. Supabase kicks off the Google OAuth flow.
3. Google redirects back to `/auth/callback` with `?code=...`.
4. `app/auth/callback/route.ts` exchanges the code for a session, then calls `findWhitelistEntry(email)`.
5. **If the email is not whitelisted**: `supabase.auth.signOut()` is called, the `auth.users` row is deleted via service-role (best-effort), and the user is redirected to `/login?error=not_whitelisted`.
6. **If whitelisted**: `upsertWhitelistedUser` writes into `public.users` with `team_id` + `role` from the whitelist entry, a `signin` row is written to `audit_logs`, and the user is redirected to `/dashboard`.

Edge cases:

- Missing email from Google (extremely rare) → redirects to `/login?error=missing_email`.
- OAuth exchange fails → `/login?error=oauth_failed`.
- Service-role deletion in step 5 is best-effort — if it fails, the sign-out already revoked the session, so it's just a bit of auth detritus.

## Session gating

- `middleware.ts` runs on every request. Public paths: `/login`, `/auth/*`, `/api/cron/*`, `/favicon.ico`.
- Any other path without a session redirects to `/login`.
- Authed users hitting `/login` are bounced to `/dashboard`.
- Admin-only pages (`/admin/whitelist`, `/admin/audit`) call `requireAdmin()` in `lib/auth/get-session.ts`; coach-only actions call `requireCoachOrAdmin()`.

## Look up a player's stats

1. User navigates to `/stats/{riot_name}/{riot_tag}` (or clicks from the roster).
2. Server-side calls hit `/api/henrik/account`, `/api/henrik/matches`, `/api/henrik/mmr`, `/api/henrik/mmr-history` as needed.
3. Each proxy route checks `henrik_cache` first; on miss it fetches from HenrikDev, normalizes via `lib/henrik/normalize.ts`, caches with the appropriate TTL, and returns.
4. Page renders charts (Recharts) + recent-matches list.

## Get an AI insight for a player

1. User navigates to `/insights/{riot_name}/{riot_tag}`.
2. Server loads the player's last 20 matches + MMR history from cache/Henrik.
3. `runEngine(...)` in `lib/insights/engine.ts` computes predicted rank (low/high), confidence, momentum, consistency, RR trend, best agents, weak maps, strengths, weaknesses, and a baseline summary.
4. `enhanceWithLLM(...)` in `lib/insights/llm.ts` sends the engine output to OpenRouter (if `OPENROUTER_API_KEY` is set) with a strict system prompt: **numeric predictions must not change**, output JSON only, 2–3 sentence summary + 3 imperative improvement suggestions.
5. The final prediction is upserted into `ai_predictions` with `llm_used = true` iff the LLM call succeeded. Confidence + "LLM used" / "Rules only" badge is shown in the UI.

## Log a match + add a coach note

1. Coach/admin goes to `/matches/new`, fills opponent, type (`scrim`/`official`/`tournament`), date, map, scores, optional notes and VOD URL.
2. Submit → `/api/matches` inserts into `public.matches` with `team_id` from the session.
3. On the detail page `/matches/[id]`, team members read the match. Coaches/admins (or any user for their own notes) post free-text coach notes via `/api/coach-notes`.
4. RLS enforces that team members only ever see their own team's matches.

## Team chat (realtime)

1. User opens `/chat/[channel]`.
2. Component subscribes via `@supabase/ssr` client-side client to the `chat_messages` table filtered by `channel_id`.
3. Send flow: POST to `/api/chat/send` with `{channel_id, body}`; the route validates with `author_id = auth.uid()` and inserts. Realtime broadcasts the insert to all subscribers.

## Admin: manage the whitelist

1. Admin visits `/admin/whitelist`.
2. `requireAdmin()` gates the page.
3. Admin can add/remove email → team/role entries via `/api/admin/whitelist`. Each action logs to `audit_logs`.
4. `/admin/audit` shows the trail.

## Cron: refresh stats + regenerate insights

- `/api/cron/refresh-stats` runs every 6h (Vercel cron). Gated by `Authorization: Bearer ${CRON_SECRET}`. Walks every tracked `player_profile`, pulls latest Henrik data, updates the cached snapshot + `tracked_stats`.
- `/api/cron/regenerate-insights` runs nightly at 04:00 UTC. Regenerates `ai_predictions` for every tracked player via the same engine + LLM pipeline.
