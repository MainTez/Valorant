---
tags: [product, domain]
created: 2026-04-21
---

# Domain Model

Core concepts in Nexus Team Hub and how they relate. Source-of-truth for the vocabulary used in code and UI. The schema-level view lives in [[data-model]]; this file is the conceptual layer.

## Entities

### Team

A competitive Valorant team. Two exist and are seeded: **Surf'n Bulls** (`surf-n-bulls`, gold, `#f3bf4c`) and **Molgarians** (`molgarians`, red, `#ff4655`). A team owns all its team-scoped data — users, matches, routines, tasks, chat channels, schedule events, notes. Accent color is carried in both the DB (`teams.accent_color`) and TypeScript constants (`lib/constants.ts`).

Key invariants:

- Slug is globally unique.
- A team's accent color drives the `[data-team]` CSS theme switch.

### User

A signed-in member of exactly one team. Mirrors `auth.users` and adds role + Riot identity. Roles: `player`, `coach`, `admin`.

Key fields / invariants:

- Every user belongs to exactly one team (`users.team_id` is `not null`).
- `role` ∈ {`player`, `coach`, `admin`}.
- Riot identity (`riot_name`, `riot_tag`, `riot_region`) is optional and currently maintained directly in Supabase — no in-app linking UI.
- A user can only exist if their email is in the `whitelist` table when they first authenticate.

### Whitelist entry

Gate for sign-in. Pairs an email with a `team_id` and a `role`. Only admins can read or mutate the whitelist. Non-whitelisted sign-ins are revoked and the `auth.users` row is deleted (best-effort via service-role).

### Player Profile

A Riot identity being tracked for stats — typically (but not necessarily) linked to a `User`. Stores the last Henrik snapshot (current rank, RR, peak, headshot%, KD, ACS, win rate) and is unique on `(riot_name, riot_tag)`. Detached profiles (`team_id is null`) are readable by any authed user.

### Tracked Stat

A per-match time-series entry populated from HenrikDev. Cascades from `Player Profile`. Uniqueness on `(player_profile_id, match_id)`. Holds map, agent, mode, result, K/D/A, ACS, ADR, headshot%, RR change, and the raw Henrik payload.

### Match

A manually-logged scrim / official / tournament match. Team-scoped. Distinct from `tracked_stats` (which is Henrik's per-match data for a single player) — a `Match` is the team's record of a full match against an opponent. Zero-or-more `Coach Notes` cascade from it.

### Coach Note

Free-text note attached to a match. Author-managed (authors edit their own; admins bypass). Written by coaches or admins; players may author their own but role policy prefers coach/admin or `author_id = auth.uid()`.

### Routine + Routine Progress

A `Routine` is a team-shared practice template with a JSONB `items` array (id + label pairs). `Routine Progress` is a per-user, per-day record of which item ids the user has completed. Unique on `(routine_id, user_id, date)`. The seed creates one "Daily practice" routine per team with items `aim_training`, `deathmatch`, `vod_review`, `strat_practice`, `team_comms`.

### Task

Team-scoped kanban item. Status ∈ {`backlog`, `in_progress`, `done`}; priority ∈ {`low`, `med`, `high`}. Optionally assigned and due-dated.

### Chat Channel + Chat Message

Team-scoped chat. Six default channels seeded per team: `general`, `match-day`, `strats`, `routines`, `review`, `announcements`. Messages use Supabase Realtime for live updates. Only channel authors edit/delete their own messages (coach/admin can override delete).

### AI Prediction

A snapshot of the [[0001-hybrid-ai-insights-engine|rule engine]] output for a `Player Profile`. Records `predicted_rank` (plus low/high), `confidence`, `momentum`, `consistency`, `rr_trend`, `win_rate`, best agents, weak maps, improvement suggestions, `reasoning` prose, `engine_version`, `data_points`, and `llm_used` (true iff an OpenRouter call succeeded and the prose came from the LLM). Clients only read via RLS; writes are server-side with the service role.

### Schedule Event

Team calendar entry. Kind ∈ {`practice`, `scrim`, `match`, `review`, `custom`}. Participants is a `uuid[]`. Currently read-only in the UI — events must be seeded via Supabase directly.

### Team Note

Team-scoped weekly focus / announcement / important pinned note. Seeded with a "Mid Control" weekly focus per team.

### Activity Event + Audit Log

`Activity Event` is a team-scoped feed (verb + object). `Audit Log` is admin-scoped security trail — sign-ins, whitelist changes, admin actions.

### Henrik Cache

Server-only key/value cache for HenrikDev responses. TTLs per endpoint family — see [[0004-henrik-proxy-cache-strategy]].

## Relationships

- `Team` 1—* `User`, `Match`, `Routine`, `Task`, `Chat Channel`, `Chat Message`, `Schedule Event`, `Team Note`, `Activity Event`. Team-scoped deletes cascade.
- `User` 0—* `Player Profile` (a user can have no tracked profile, or a profile can be detached).
- `Player Profile` 1—* `Tracked Stat` (cascade) and 1—* `AI Prediction` (cascade).
- `Match` 1—* `Coach Note` (cascade).
- `Routine` 1—* `Routine Progress` (cascade per user per day).
- `Chat Channel` 1—* `Chat Message` (cascade).
- `Whitelist` is independent — it's consulted at `/auth/callback` and referenced by email rather than FK'd into `users`.

## Invariants

- **Team isolation**: every team-scoped row is readable only to members of that `team_id` (admin bypasses). Enforced by RLS using `public.current_team_id()` and `public.is_admin()` helpers.
- **Whitelist gate**: a user row in `public.users` exists only after passing the whitelist check at `/auth/callback`.
- **One insight source of truth**: numeric fields on `ai_predictions` are produced by `lib/insights/engine.ts`. The LLM may only supply `reasoning` and `improvement_suggestions` text. See [[0001-hybrid-ai-insights-engine]].
- **Henrik key containment**: the HenrikDev API key is server-only; all Henrik access goes via `/api/henrik/*` which consult `lib/henrik/cache.ts` first.

See [[data-model]] for the schema-level view.
