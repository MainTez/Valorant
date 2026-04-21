---
tags: [product, vision]
created: 2026-04-21
updated: 2026-04-21
---

# Vision

## What this project is

**Nexus Team Hub** is a private esports command center for two competitive Valorant teams. It combines authenticated team workspaces, HenrikDev-powered player stats, rule-based + LLM-assisted AI insights, a manual match log with coach notes, practice routines, a kanban task board, realtime team chat, and admin whitelist management into a single Next.js 15 app.

## Who it's for

- **Surf'n Bulls** — Norwegian team, gold accent (slug `surf-n-bulls`, `#f3bf4c`, motto "One team. One mind. One goal.").
- **Molgarians** — red accent (slug `molgarians`, `#ff4655`, motto "Analytical minds. Tactical planners.").
- Roles inside each team: `player`, `coach`, `admin`.
- Owners/admins: **Vegard Laland** (`vegard.laland@gmail.com`) and **danilebnen** (`danilebnen@gmail.com`), both seeded as admins on the Surf'n Bulls team.
- Access is strictly gated — only Gmail addresses present in `public.whitelist` can sign in; anyone else has their auth user deleted on first attempt.

## Core value

1. **One place for the team.** Stats, match log, routines, tasks, and chat live in one authenticated workspace per team — no tool sprawl.
2. **Explainable AI insights.** Rank predictions come from a rule-based engine whose numeric output the LLM is forbidden to alter; the LLM only phrases the coach summary. Every prediction surfaces `confidence`, `momentum`, `consistency`, and `data_points`.
3. **Team isolation by default.** Row-Level Security on every team-scoped table means a Surf'n Bulls player literally cannot read Molgarians data, and vice versa — enforced in Postgres, not app code.
4. **Premium feel.** Dark UI, per-team accent via `[data-team]`, shadcn primitives, Recharts. Built desktop-first.

## What it is not (yet)

- **Not public.** There's no open sign-up. Whitelist or nothing.
- **Not mobile-first.** Desktop-first by spec; mobile/tablet polish is deferred.
- **Not a Riot-ID-link UX.** Users still edit `users.riot_name` / `users.riot_tag` directly in Supabase — no in-app linking flow yet.
- **Not a VOD platform.** The match log stores a `vod_url` field only; no upload, no in-app player.
- **Not internationalised.** UI copy is English throughout (team name "Surf'n Bulls" is in-universe, not localisation).
- **Not test-covered.** There is no test suite yet.

## Success criteria

- ✅ Two teams can sign in via Google OAuth gated by a Gmail whitelist; non-whitelisted sign-ins are revoked and the auth user is deleted.
- ✅ Per-team data isolation is enforced in Postgres via RLS on every team-scoped table.
- ✅ HenrikDev stats (account, matches, MMR, history) flow through a server-side proxy with TTL cache in `henrik_cache`; the API key never ships to the browser.
- ✅ AI insights combine [[0001-hybrid-ai-insights-engine|the rule engine]] with an optional [[0002-openrouter-over-openai|OpenRouter LLM]]; degrades gracefully to rules-only if `OPENROUTER_API_KEY` is missing.
- ✅ Vercel cron regenerates stats every 6h and insights nightly.
- ⚠️ Live Supabase project and Google OAuth client are not yet wired up.
- ⚠️ Real team rosters (Riot IDs) are not yet populated.
- ❌ No tests, no CI, no mobile polish, no in-app event creation UI for the calendar.
