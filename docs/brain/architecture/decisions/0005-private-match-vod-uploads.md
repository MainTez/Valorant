---
id: 0005
status: accepted
date: 2026-04-23
tags: [adr, storage, vod]
---

# ADR 0005 — Private match VOD uploads via Supabase Storage

## Context

The original match log only stored a plain `vod_url` string. That was fine for linking a YouTube upload after the fact, but it failed the workflow the teams actually asked for: upload the full MP4 of a scrim or official directly inside the app.

Three constraints shape the solution:

1. **The VODs are team-private.** Scrim footage should not live in a public bucket or on a guessable URL.
2. **The files are large.** Routing MP4 bytes through a Vercel function would be wasteful and fragile; the browser should upload directly to Storage.
3. **This app is not becoming a full VOD platform.** We need reliable attach/open/replace behavior, not transcoding, clipping, comments, playlists, or search indexing.

The realistic options were:

- Keep `vod_url` only → cheapest, but does not satisfy direct upload.
- Public bucket + browser upload → simple, but leaks private scrim footage.
- Private bucket + app-issued signed upload/download URLs → direct browser upload without exposing the files publicly.

## Decision

1. **Support one uploaded MP4 per match** and store its metadata on `public.matches` via new nullable columns:
   - `vod_storage_path`
   - `vod_original_name`
   - `vod_content_type`
   - `vod_size_bytes`
2. **Keep `vod_url` as the external-link fallback** for legacy/manual links. If a user attaches an uploaded MP4, the app clears `vod_url` and treats the upload as the canonical VOD.
3. **Use a private Supabase Storage bucket named `match-vods`.** The browser uploads directly to Storage, but only after the app mints a short-lived signed upload token from `/api/matches/[id]/vod`.
4. **All storage access is app-mediated.** Downloads also go through `/api/matches/[id]/vod`, which checks session + team ownership and then redirects to a short-lived signed URL. The bucket is never exposed as public.
5. **Create the bucket lazily from the service-role path** if it does not exist yet, with MP4-only MIME restrictions and a 5 GB size cap. This keeps first-use setup inside the repo-backed application instead of depending on a manual dashboard step.
6. **Expose the flow in two places:**
   - `components/matches/match-entry-form.tsx` can upload immediately after creating a match.
   - `components/matches/match-vod-manager.tsx` on `/matches/[id]` handles retry, replace, and delete.
7. **Do not add an in-app video player yet.** The shipped UX is upload + signed open-link. Rich playback UX is deferred.

## Consequences

Good:

- **Private by default.** Files sit in a non-public bucket and only become reachable through signed URLs created after the app authorizes the request.
- **Large uploads bypass Vercel compute.** The browser sends the MP4 straight to Supabase Storage.
- **Retry path exists.** If the post-create upload fails, the match detail page can retry or replace the file without re-logging the match.
- **Minimal schema churn.** One match still maps to one VOD, which matches the current product scope.

Bad / tradeoff:

- **No transcoding or streaming optimization.** We store the original MP4 only. Huge files remain huge.
- **Single-file model only.** Map-level clips, multiple camera angles, and analyst cuts would require a dedicated `match_vods` table later.
- **Lazy bucket creation is operationally convenient but less declarative** than provisioning the bucket entirely in SQL migrations.

Neutral:

- **External links still work.** The upload flow does not remove the option to paste a third-party VOD URL when that is more convenient.

## When to revisit

- If teams want multiple VODs per match (coach cut + POV + stage feed) → split metadata out of `matches` into a dedicated `match_vods` table.
- If playback UX becomes important → add an in-app player and range-request tuning, or transcode to streaming-friendly outputs.
- If lazy bucket creation proves surprising in prod → move bucket provisioning into explicit Supabase infrastructure management.

## Related

- [[stack]]
- [[status]]
- [[vision]]
- [[0003-team-isolation-via-supabase-rls]]
