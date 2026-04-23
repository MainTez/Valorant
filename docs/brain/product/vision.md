---
tags: [product, vision]
created: 2026-04-21
updated: 2026-04-23
---

# Vision

## What this project is

**Nexus Team Hub** is a private esports command center for two competitive Valorant teams. It combines authenticated team workspaces, HenrikDev-powered player stats, rule-based + LLM-assisted AI insights, a manual match log with coach notes, private MP4 VOD uploads with in-app playback, practice routines, a kanban task board, realtime team chat, and admin whitelist management into a single Next.js 15 app.

## Who it's for

- **Surf'n Bulls** — Norwegian team, gold accent (slug `surf-n-bulls`, `#f3bf4c`, motto "One team. One mind. One goal.").
- **Molgarians** — red accent (slug `molgarians`, `#ff4655`, motto "Analytical minds. Tactical planners.").
- Roles inside each team: `player`, `coach`, `admin`.
- Owners/admins: **Vegard Laland** (`vegard.laland@gmail.com`) and **danilebnen** (`danilebnen@gmail.com`), both seeded as admins on the Surf'n Bulls team.
- Access is strictly gated — whitelisted Gmail users come through Google OAuth, and a team-scoped VIP shortcut exists only for AI agents that need to test the website.

## Core value

1. **One place for the team.** Stats, match log, routines, tasks, and chat live in one authenticated workspace per team — no tool sprawl.
2. **Explainable AI insights.** Rank predictions come from a rule-based engine whose numeric output the LLM is forbidden to alter; the LLM only phrases the coach summary. Every prediction surfaces `confidence`, `momentum`, `consistency`, and `data_points`.
3. **Team isolation by default.** Row-Level Security on every team-scoped table means a Surf'n Bulls player literally cannot read Molgarians data, and vice versa — enforced in Postgres, not app code.
4. **Premium feel.** Dark UI, per-team accent via `[data-team]`, shadcn primitives, Recharts. Built desktop-first.

## What it is not (yet)

- **Not public.** There's no open sign-up. Whitelist or nothing.
- **Not mobile-first.** Desktop-first by spec; mobile/tablet polish is deferred.
- **Not a Riot-ID-link UX.** Users still edit `users.riot_name` / `users.riot_tag` directly in Supabase — no in-app linking flow yet.
- **Not a full VOD platform.** Teams can attach one private MP4 per match, browse it from the in-app VOD library, and watch it in an embedded player, but there's still no transcoding, clipping, playlists, or timestamped comments.
- **Not internationalised.** UI copy is English throughout (team name "Surf'n Bulls" is in-universe, not localisation).
- **Not comprehensively test-covered.** A small `node:test` check exists for the VOD helper logic, but there is still no broader app test suite or CI.

## Success criteria

- ✅ Two teams can sign in via Google OAuth gated by a Gmail whitelist; non-whitelisted sign-ins are revoked and the auth user is deleted.
- ✅ Per-team data isolation is enforced in Postgres via RLS on every team-scoped table.
- ✅ HenrikDev stats (account, matches, MMR, history) flow through a server-side proxy with TTL cache in `henrik_cache`; the API key never ships to the browser.
- ✅ AI insights combine [[0001-hybrid-ai-insights-engine|the rule engine]] with an optional [[0002-openrouter-over-openai|OpenRouter LLM]]; degrades gracefully to rules-only if `OPENROUTER_API_KEY` is missing.
- ✅ Vercel cron regenerates stats and insights nightly (03:00 + 04:00 UTC; Hobby plan is daily-only).
- ✅ Teams can attach one private MP4 VOD per match through Supabase Storage; the app issues signed upload/download URLs so the bucket stays private, supports inline playback, and exposes a dedicated `/vods` library.
- ⚠️ Live Supabase project and Google OAuth client are not yet wired up.
- ⚠️ Real team rosters (Riot IDs) are not yet populated.
- ❌ No CI, no mobile polish, and no in-app event creation UI for the calendar. Testing is still minimal and localized to the VOD helper flow.
