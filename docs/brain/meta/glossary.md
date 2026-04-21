---
tags: [meta, glossary]
created: 2026-04-21
---

# Glossary

Domain and tech terms used across the Nexus Team Hub codebase. When a term has a specific meaning here that differs from general usage, document it.

## Domain terms

### Surf'n Bulls

One of the two teams (Norwegian). Accent: **gold** (`#f3bf4c`). Slug: `surf-n-bulls`. Motto: "One team. One mind. One goal." The apostrophe in the team name is required everywhere (SQL seed, TypeScript constants, UI copy). SQL-escaped as `'Surf''n Bulls'`.

### Molgarians

The other team. Accent: **red** (`#ff4655`). Slug: `molgarians`. Motto: "Analytical minds. Tactical planners."

### Whitelist

The `public.whitelist` table — an admin-curated map of email → (team, role). Acts as the sign-in gate. Emails not in the whitelist cannot sign in; their `auth.users` row is deleted.

### Riot ID

A player's in-game identity: `riot_name#riot_tag`. Stored on `users` (for signed-in members) and on `player_profiles` (for tracked profiles). Format: `Name#TAG`.

### Tracked stat

A per-match row on `public.tracked_stats` populated by the HenrikDev sync. One row per `(player_profile_id, match_id)`. Distinct from a "Match" (which is the team's manually-logged record against an opponent).

### Match (team log) vs. match (Henrik)

- **Team match** (`public.matches`) — a scrim/official/tournament entry logged by a coach/admin, with opponent and scores.
- **Henrik match** (`tracked_stats` row) — an individual player's per-match stat line pulled from HenrikDev.

They're not foreign-keyed together.

### Routine

A team-shared practice template. One seeded per team: "Daily practice" with items `aim_training`, `deathmatch`, `vod_review`, `strat_practice`, `team_comms`.

### AI prediction

A snapshot of the rule engine + optional LLM output for a player profile. `llm_used` is true iff the OpenRouter call succeeded. Numeric fields always come from the rule engine; prose may come from the LLM. See [[0001-hybrid-ai-insights-engine]].

### Henrik cache key

The string used as the primary key in `henrik_cache`. Constructed per-endpoint in `lib/henrik/client.ts` — typically `{endpoint}:{name}:{tag}:{region}` or similar. Unique per request shape.

## Tech terms

### RLS (Row-Level Security)

Postgres-native per-row access control. Every team-scoped table in Nexus has policies using `public.current_team_id()` and `public.is_admin()` to enforce team isolation. See [[0003-team-isolation-via-supabase-rls]].

### Service role

Supabase's `service_role` key — bypasses RLS entirely. Used only by `lib/supabase/admin.ts` for operations that need to cross team boundaries (Henrik sync, AI regen, whitelist admin, auth user deletion).

### `[data-team]`

CSS theming hook. Set on the root of the authed shell from the session's team slug. Drives the accent-color swap between gold (Surf'n Bulls) and red (Molgarians). Lives in `app/globals.css`.

### Cron secret

`CRON_SECRET` env var. Required on the `Authorization: Bearer ...` header of requests to `/api/cron/*`. Prevents unauthenticated hits from triggering batch work.

### Rules-only / LLM used

UI badges on AI insight reports. "LLM used" = the OpenRouter call succeeded and the prose in the report came from the model. "Rules only" = the call failed (or no key) and the prose came from the rule engine's baseline summary.

## Abbreviations

| Abbreviation | Expansion | Context |
|---|---|---|
| SNB | Surf'n Bulls | Team short name (`lib/constants.ts`) |
| MLG | Molgarians | Team short name |
| RR | Rank Rating | Valorant MMR-like value that ticks up/down per competitive match |
| MMR | Matchmaking Rating | Valorant's hidden rank value |
| ACS | Average Combat Score | Valorant's per-round performance metric |
| ADR | Average Damage per Round | Valorant damage metric |
| HS% | Headshot percentage | Player accuracy stat |
| K/D/A | Kills / Deaths / Assists | Per-match stat line |
| RLS | Row-Level Security | Postgres access control — see [[0003-team-isolation-via-supabase-rls]] |
| ADR | Architecture Decision Record | A dated decision doc under `architecture/decisions/` (note: same TLA as Average Damage per Round; context resolves) |
| SSR | Server-Side Rendering | Next.js default rendering mode |
