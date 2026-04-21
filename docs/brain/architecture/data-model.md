---
tags: [architecture, data]
created: 2026-04-21
---

# Data Model

Schema-level view of the Supabase Postgres database. Canonical shape lives in [`supabase/migrations/0001_init.sql`](../../supabase/migrations/0001_init.sql), RLS in [`0002_rls_policies.sql`](../../supabase/migrations/0002_rls_policies.sql), seed in [`0003_seed.sql`](../../supabase/migrations/0003_seed.sql). TypeScript row shapes live in [`types/domain.ts`](../../types/domain.ts).

## Tables

- `teams` — the two competitive teams. Slug-keyed (`surf-n-bulls`, `molgarians`), accent color, motto.
- `whitelist` — admin-curated email → (team, role) map. The sign-in gate.
- `users` — mirrors `auth.users`, scoped to one team. `role ∈ {player, coach, admin}`, Riot identity fields, online/away/offline status.
- `player_profiles` — Riot identity + last Henrik snapshot. Unique on `(riot_name, riot_tag)`.
- `tracked_stats` — per-match time-series populated from Henrik. Unique on `(player_profile_id, match_id)`. Holds raw jsonb for replay.
- `matches` — manually-logged scrim/official/tournament. Team-scoped.
- `coach_notes` — free-text notes attached to a match.
- `routines` — team-shared practice templates with JSONB items.
- `routine_progress` — per-user per-day completion record (unique on `(routine_id, user_id, date)`).
- `tasks` — team-scoped kanban. Status + priority + optional assignee/due.
- `chat_channels` + `chat_messages` — team chat. Six default channels seeded per team.
- `ai_predictions` — rule-engine + LLM output snapshots. `llm_used boolean` flags whether prose came from the LLM.
- `schedule_events` — team calendar entries (`practice`, `scrim`, `match`, `review`, `custom`).
- `team_notes` — weekly focus / announcement / important pinned notes.
- `activity_events` — team-scoped feed.
- `audit_logs` — admin-scoped security trail.
- `henrik_cache` — server-only key/value store for HenrikDev responses with per-endpoint TTLs.

## Key relationships

- `teams` 1—* `users`, `matches`, `routines`, `tasks`, `chat_channels`, `chat_messages`, `schedule_events`, `team_notes`, `activity_events`. All team-scoped children cascade on team delete.
- `users` 0—* `player_profiles` (via `user_id`, nullable — a profile can be detached).
- `player_profiles` 1—* `tracked_stats` (cascade) and 1—* `ai_predictions` (cascade).
- `matches` 1—* `coach_notes` (cascade).
- `routines` 1—* `routine_progress` (cascade), and `routine_progress` references `users` (cascade on user delete).
- `chat_channels` 1—* `chat_messages` (cascade).
- `whitelist.team_id` → `teams.id` (cascade).
- `users.team_id` → `teams.id` (restrict — you can't delete a team that still has users).

## Invariants enforced at the DB level

- **Row-Level Security on every table** (including `teams`, `whitelist`, `henrik_cache` — the last is server-only via service-role which bypasses RLS).
- Helper functions `public.current_team_id()`, `public.current_role()`, `public.is_admin()`, `public.is_coach_or_admin()` — `security definer` with `set search_path = public`.
- Team-scoped read policies: members can read rows where `team_id = current_team_id()`; admins always pass.
- `users`: members can read self + same-team rows; only admins write.
- `player_profiles` / `tracked_stats` / `ai_predictions`: team members can read their team's profiles (and profiles with `team_id is null`); writes on `tracked_stats` and `ai_predictions` are admin-only (server-side).
- `coach_notes`, `matches`, `tasks`, `chat_messages`: authors manage their own rows; coach/admin can delete any; admins bypass.
- `chat_messages` insert requires `author_id = auth.uid()` and `team_id = current_team_id()`.
- `routine_progress` insert/update requires `user_id = auth.uid()`.
- `audit_logs`: admin-only read and write.
- Check constraints on status/role/kind enums — see `0001_init.sql`.
- Uniqueness: `teams.slug`, `whitelist.email`, `users.email`, `(player_profiles.riot_name, player_profiles.riot_tag)`, `(tracked_stats.player_profile_id, match_id)`, `(chat_channels.team_id, slug)`, `(routine_progress.routine_id, user_id, date)`.

## Invariants enforced at the app level

- **Whitelist check on sign-in** — `/auth/callback/route.ts` is the only place a `public.users` row gets created. Bypass the callback and no user row exists → RLS denies everything.
- **Henrik API key containment** — only `lib/henrik/client.ts` reads `process.env.HENRIK_API_KEY`; it's called only from server code (route handlers / cron).
- **LLM cannot change numeric predictions** — `lib/insights/llm.ts` only overwrites the `reasoning` prose and `improvement_suggestions` array. Numeric fields (`predicted_rank`, `confidence`, `momentum`, etc.) are always the engine output. See [[0001-hybrid-ai-insights-engine]].
- **Cron secret check** — `/api/cron/*` routes verify `Authorization: Bearer ${CRON_SECRET}` before running.

## Migration conventions

- Numbered and kebab-cased: `NNNN_short_name.sql`.
- Applied in order via Supabase CLI (`supabase db push`) or pasted into the SQL editor.
- `updated_at` maintained via trigger `public.touch_updated_at()` on `users`, `tasks`, `routine_progress`.

## Generated types status

- `types/database.ts` is currently `export type Database = Record<string, unknown>;` — a placeholder.
- The Supabase clients in `lib/supabase/{client,server,admin}.ts` therefore do not pass a `<Database>` generic (the empty-record shape was producing `never` inference on queries).
- Row typing happens at call-sites by casting to the domain types in `types/domain.ts`.
- Plan: wire up `supabase gen types typescript --local > types/database.ts` after the live Supabase project is provisioned, then re-introduce the generic. Tracked in [[next-up]].

See [[domain-model]] for the conceptual view.
