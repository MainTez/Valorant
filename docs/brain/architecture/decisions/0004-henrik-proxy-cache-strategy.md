---
id: 0004
status: accepted
date: 2026-04-21
tags: [adr, api, data]
---

# ADR 0004 — HenrikDev proxy + Supabase cache strategy

## Context

HenrikDev is an unofficial but widely-used Valorant API that returns account, matches, MMR, and MMR-history data. Three hard constraints frame the integration:

1. **The API key is a shared secret.** It cannot ship to the browser — if it does, abuse rate-limits can cost us access for all our users.
2. **Rate limits are real.** Hitting Henrik every page load for 10+ players is the path to 429s and key bans.
3. **Different endpoints age at different rates.** Account identity barely changes; MMR moves game-by-game.

Options for structuring this:

- Client calls Henrik directly → leaks the key. Rejected.
- Server calls Henrik on every request → works but trashes rate limits and adds latency.
- Server calls Henrik through a cache with per-endpoint TTLs → what we want.

Where to put the cache? In-memory per-serverless-instance caches evaporate between invocations. Redis / KV adds a dependency. Supabase Postgres is already in the stack.

## Decision

1. **All HenrikDev access goes through server-side proxy routes under `/api/henrik/*`** (`account`, `matches`, `mmr`, `mmr-history`). No client-side Henrik calls.
2. **A Postgres `henrik_cache` table** (`endpoint_key text primary key`, `payload jsonb`, `expires_at timestamptz`) stores normalized responses. `lib/henrik/cache.ts` provides `getCached<T>(key)` / `setCached(key, payload, ttlSeconds)` using the service-role Supabase client. RLS is irrelevant for this table — only the service role touches it.
3. **Per-endpoint TTLs** defined in `HENRIK_CACHE_TTLS` (`lib/constants.ts`):
   - `account` — 1 hour (identity is very stable)
   - `matches` — 10 minutes (new matches appear but not every second)
   - `mmr` — 2 minutes (RR moves game-by-game; we want close-to-live)
   - `mmrHistory` — 15 minutes (history changes slower than current MMR)
4. **Normalization at ingest time.** `lib/henrik/normalize.ts` flattens Henrik's deeply-nested response into the shapes in `types/domain.ts` (`NormalizedAccount`, `NormalizedMMR`, `NormalizedMatch`, `NormalizedMmrHistoryEntry`). The cache stores the _normalized_ payload.
5. **Cron-driven refresh.** `/api/cron/refresh-stats` runs daily at 03:00 UTC (Vercel cron) and proactively refreshes every tracked `player_profile`'s snapshot into `tracked_stats` and the `player_profiles.last_synced_at` column. Intra-day freshness comes from the per-endpoint TTL cache on on-demand requests — the cron is just there to make sure the nightly `regenerate-insights` run at 04:00 UTC sees up-to-date data and so the dashboard has a warm snapshot before anyone logs in. Originally this was `0 */6 * * *` (every 6h) but Vercel's Hobby plan caps crons at once per day; dropping to daily is fine because the TTL cache handles in-session freshness.

## Consequences

Good:

- **Key never ships client-side** — `HENRIK_API_KEY` is read only in `lib/henrik/client.ts` under `server-only`.
- **Rate-limit headroom.** Cache hits dominate. A hot dashboard serving 5 players costs 0 Henrik calls for up to 10 minutes.
- **Normalization isolated.** The rest of the app never sees Henrik's raw shape — easy to upgrade the Henrik integration without churning UI code.
- **Cache is just Postgres.** No extra dependency, inherits backups, survives instance restarts.

Bad / tradeoff:

- **Cache eviction is lazy.** `expires_at < now()` → miss → refetch. Expired rows accumulate until the next insert; housekeeping is deferred. A nightly job could delete them but isn't critical.
- **Race on miss.** Two simultaneous requests on a cold cache both hit Henrik. Harmless at our scale; a dedupe layer would help at high traffic.
- **No per-user rate limiting on the proxy routes.** A logged-in player with a scripted client could churn the cache. Acceptable in a whitelisted 20-person app; we'd add a limiter before going public.

Neutral:

- The MMR TTL of 2 minutes means "live" rank shown in the UI can lag by up to 2 minutes after a game. Users tolerate this; the trade for rate-limit safety is worth it.

## When to revisit

- If MMR lag complaints surface after games → drop the MMR TTL toward 30s and accept more Henrik calls.
- If we add a 20+ player roster pushing cron regen past free-tier rate limits → introduce a staggered schedule or a worker queue.
- If HenrikDev publishes a stable paid tier / webhook API → consider push instead of pull and retire the cache table.
- If the cache table grows unbounded (thousands of stale rows) → add a daily cleanup cron.

## Related

- [[stack]]
- [[data-model]]
- [[0003-team-isolation-via-supabase-rls]]
