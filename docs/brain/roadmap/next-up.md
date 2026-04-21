---
tags: [roadmap, todo]
created: 2026-04-21
---

# Next Up

Ordered by dependency. Items further down assume the ones above them are done. Long-term backlog lives elsewhere.

## 1. Bring up a live Supabase project

Create a Supabase project, apply migrations `0001_init.sql` → `0003_seed.sql`, configure Google OAuth provider (authorized redirect `https://<project>.supabase.co/auth/v1/callback`). Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Unblocks everything else.

## 2. Generate Supabase types and re-introduce the `<Database>` generic

Run `supabase gen types typescript --local > types/database.ts` against the live project. Then re-add the `<Database>` generic to the clients in `lib/supabase/{client,server,admin}.ts`. Verify no `never` inference. This removes the placeholder noted in [[data-model]].

## 3. Seed real team rosters

Add whitelist entries for each Surf'n Bulls + Molgarians member (email → team, role). Populate `users.riot_name` / `users.riot_tag` / `users.riot_region` for each player directly in Supabase. Create matching `player_profiles` rows so stats + insights work.

## 4. Wire Vercel deployment + cron secret

Create a Vercel project, bind env vars, deploy. Set `CRON_SECRET` to a long random string in both Vercel and the Supabase/HenrikDev config files. Verify `/api/cron/refresh-stats` and `/api/cron/regenerate-insights` run on schedule.

## 5. Calendar event creation UI

Add a create/edit form for `schedule_events` on `/calendar`. Gated by `requireCoachOrAdmin()`. Small form: title, kind, start/end, optional description/location/participants. Today's page is read-only.

## 6. Riot-ID link UI on `/players`

Let a user edit their own `riot_name` / `riot_tag` / `riot_region` from the UI (RLS already allows self-update). Bonus: trigger a Henrik lookup on save to populate `player_profiles` if one doesn't exist.

## 7. Basic test smoke layer

Pick Vitest + React Testing Library or Playwright (see [[open-questions]]). At minimum: a handful of RLS tests against a local Supabase instance, plus a login-redirect e2e. CI on GitHub Actions.

See [[status]] for what's done and [[open-questions]] for what's undecided.
