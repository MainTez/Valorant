---
tags: [session, vip, auth, vod, bugfix]
created: 2026-04-23
updated: 2026-04-23
---

# 2026-04-23 — Fix VOD upload "Match not found" by restoring real Supabase session for VIP

## Context

VIP agent login (added to unblock AI testing per [[0003-team-isolation-via-supabase-rls]]) was "simplified" in commit `b19797b` to set only a cookie instead of signing the VIP user into Supabase Auth. Every team-scoped query then ran through the anon server client with `auth.uid() = null`, and every RLS policy on `public.matches`, `public.coach_notes`, etc. evaluates `team_id = public.current_team_id()` against that null id — resolving to false. The result was `maybeSingle()` silently returning `null`, which the VOD upload route surfaces as `"Match not found"` (plus the same symptom on playback, delete, and implicitly on inserts).

## Decision

Restore real Supabase Auth for VIP sessions so RLS matches the rest of the app:

- `/api/auth/vip-login` now idempotently creates (or updates) a real Supabase Auth user with a deterministic password, upserts the `public.users` row + whitelist, and performs `supabase.auth.signInWithPassword` on the server client so auth cookies are issued.
- `lib/auth/get-session.ts` drops the VIP cookie fallback. Once VIP has a real session, `supabase.auth.getUser()` returns the VIP user and the same `public.users + public.teams` lookups as Google OAuth users apply.
- `middleware.ts` drops the VIP cookie bypass. Access control is now purely driven by `supabase.auth.getUser()`.
- `/api/auth/vip-logout` now calls `supabase.auth.signOut()` in addition to clearing the legacy cookie (harmless best-effort cleanup for any cached client state).
- Constants/helpers split: `lib/auth/vip-config.ts` holds emails, ids, and the `isVipEmail` helper (importable from tests / non-server modules); `lib/auth/vip.ts` re-exports them and additionally exposes `VIP_PASSWORDS` under `server-only` so the passwords never end up in a client bundle.

## Why this is the right move

- It closes the actual root cause rather than papering over it with admin-client reads in each API route — RLS stays the authoritative team boundary for every page and API.
- The "pure cookie VIP" shortcut provided no meaningful simplification: every API route would still have needed custom per-session client selection, and RLS would still fail on any query that joins `public.users` via `current_team_id()`.
- The `signInWithPassword` path is fully contained in the VIP login route; no product code branches on session type.

## Test evidence

- `npm test` — 16/16 (existing 13 + 3 new `lib/auth/vip.test.ts` cases covering VIP config and `isVipEmail`).
- `npm run type-check` — clean.
- `npm run build` — clean production build.
- Reproduction MP4: `tmp/test-vod.mp4` (60.000s, 640×360, h264+aac, 622 KB) is ready to drive end-to-end upload tests once a live Supabase environment is attached.

End-to-end HTTP testing (log a match, upload the MP4, verify playback) requires a live Supabase project; no `.env.local` or running Supabase instance was available in this session so the final click-through test was not executed. With env vars attached, the VIP login → /matches/new → upload path should now succeed with the same permissions model as a whitelisted Google user.

## Follow-ups

- Wire a Supabase project (cloud or `supabase start`) so the VIP login + VOD upload path can be exercised in CI or locally.
- Consider an integration test that runs a full VIP login → match insert → VOD signed upload → attach → playback loop against a seeded Supabase instance.
