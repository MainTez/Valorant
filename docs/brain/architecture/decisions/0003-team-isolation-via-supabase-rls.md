---
id: 0003
status: accepted
date: 2026-04-21
tags: [adr, data, security]
---

# ADR 0003 — Team isolation via Supabase Row-Level Security

## Context

Nexus Team Hub hosts two rival Valorant teams in one database. Strong isolation is a hard requirement: Surf'n Bulls players must not be able to read Molgarians chat messages, match notes, tasks, routines, or AI insights — and vice versa. "Enforced in application code" is a footgun; any future route handler that forgets to add `.eq('team_id', teamId)` is a privacy leak.

The alternative architectures were:

1. Single Postgres + app-level filtering. Leaky-by-default.
2. Single Postgres + Row-Level Security. Leaky only if RLS is misconfigured, and misconfiguration is visible in the migration files.
3. One Postgres per team. Operationally expensive; admins lose their global view.
4. A lightweight auth-gateway (e.g. Hasura/Postgraphile). Adds a service.

Option 2 is the Supabase-native answer and matches how Supabase features (Realtime, policies, auth) are designed.

## Decision

**Every team-scoped table has RLS enabled, with per-`team_id` policies that compare against `public.current_team_id()` (which reads the requester's `users.team_id`).** Admins bypass via `public.is_admin()`. Coaches get extended write rights on team notes, schedule events, routines, and deletion of tasks/matches via `public.is_coach_or_admin()`.

Concretely:

- Helper functions are `security definer` with `set search_path = public` and pull the calling user's team/role from `public.users` keyed by `auth.uid()`.
- Read policies: team members can read rows where `team_id = current_team_id()`; admins always pass.
- Write policies: tighter — authors manage their own rows (chat messages, coach notes, routine progress), coach/admin can delete broadly.
- `tracked_stats` and `ai_predictions` are admin-write-only (populated by server cron using the service role).
- `henrik_cache` is server-only — no client-facing policy needed because only service-role access uses it.
- The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS entirely and is used by `lib/supabase/admin.ts` for Henrik sync, AI regen, and whitelist-side admin operations.

Team isolation is therefore enforced in Postgres, not in the route handlers. A buggy route cannot leak data across teams without the service role.

## Consequences

Good:

- **Zero-trust by default.** A forgotten `.eq('team_id', ...)` on the client or server-with-anon-key cannot return cross-team rows.
- **Realtime inherits RLS.** Supabase Realtime respects the same policies, so chat subscriptions are team-filtered without extra work.
- **Auditable in one file.** `supabase/migrations/0002_rls_policies.sql` is the single reference.
- **Admin bypass is explicit.** `is_admin()` usage is grep-able.

Bad / tradeoff:

- **Dev ergonomics.** A missing RLS policy surfaces as a silent empty result, not a compile-time error. Onboarding takes a minute of "why does this query return nothing".
- **Service-role discipline.** Anything using `createSupabaseAdminClient()` bypasses RLS and must be treated as trusted code. Only cron, Henrik sync, and whitelist-delete use it.
- **Cross-team admin views** require admin role + explicit queries; admins see across teams by design.

Neutral:

- The `public.users` mirror table is required for RLS helpers to work (you can't read custom claims from `auth.users` without a mirror). This is the Supabase-standard pattern.

## When to revisit

- If we add a third team and the helper model (single `team_id` per user) doesn't fit — e.g. coach works across teams. Today that would mean multiple `users` rows or extending the model with a user-teams join table; we'd write a new ADR.
- If RLS becomes a performance bottleneck on large queries — instrument, then add functional indexes on `team_id` or denormalize.
- If we ever expose a public/anon read path (unlikely — the product is private by design).

## Related

- [[data-model]]
- [[stack]]
- [[0004-henrik-proxy-cache-strategy]] — explains why `henrik_cache` is server-only.
