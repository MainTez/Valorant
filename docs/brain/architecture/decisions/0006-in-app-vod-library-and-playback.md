---
id: 0006
status: accepted
date: 2026-04-23
tags: [adr, storage, vod, ux]
---

# ADR 0006 — In-app VOD playback, library, and match deletion

## Context

ADR 0005 added private MP4 uploads through Supabase Storage, but deliberately stopped at upload + open-link behavior. That was enough to prove storage worked, but it left three product gaps:

1. **Playback was awkward.** Users had to open a raw signed URL in a new tab instead of watching footage in the app.
2. **VOD discovery was weak.** There was no dedicated place to browse recorded matches.
3. **Cleanup was incomplete.** Match deletion was possible at the RLS layer but not exposed in the UI or API, which made mistakes in the match log harder to fix.

Users then explicitly asked for all three: delete match logs, fix the current `VOD not found` failure mode, and add a dedicated VOD area with a player.

## Decision

1. **Keep `public.matches` as the source of truth** for match-level VOD metadata. We still store at most one uploaded MP4 and/or one external VOD link per match. No new `match_vods` table yet.
2. **Add a dedicated playback endpoint** at `/api/matches/[id]/vod/playback` that returns structured playback metadata:
   - uploaded MP4 → fresh signed Supabase URL + metadata
   - external link → URL + embeddable/direct-video hint
   - missing VOD → friendly 404 payload
3. **Use an in-app HTML5 video player** for uploaded MP4s and direct media links. We do not proxy video bytes through Next.js/Vercel; playback stays backed by short-lived signed Storage URLs.
4. **Add a first-class `/vods` section** to the authenticated app shell, with:
   - `/vods` for library/browse
   - `/vods/[id]` for dedicated playback/detail
5. **Expose match deletion in the product** through `/api/matches/[id]` + UI affordances on the match list/detail pages. Deletion removes the match row, cascades coach notes, and attempts to remove any uploaded storage object.
6. **Keep the scope intentionally narrow.** This is still not a full media platform: no transcoding, no clips, no multi-VOD model, no comments/timestamps, no playlists.

## Consequences

Good:

- **Usable playback UX.** Teams can watch uploaded footage without leaving the app.
- **Better discoverability.** The VOD library makes recorded matches a first-class surface.
- **Safer maintenance.** Incorrect match logs can now be removed cleanly, including attached uploads.
- **Still storage-efficient.** Signed URLs keep the bucket private while avoiding app-server media proxying.

Bad / tradeoff:

- **Signed URLs expire.** The player needs a refresh path instead of assuming a single long-lived source.
- **External links remain inconsistent.** Some URLs are directly playable; others still degrade to “open externally”.
- **Single-file-per-match remains a limitation.** Multi-angle review or per-map clips will require a richer data model later.

Neutral:

- The old `/api/matches/[id]/vod` redirect route remains useful as a raw-file/open-in-new-tab fallback, but the canonical player flow now uses `/vod/playback`.

## When to revisit

- If teams want more than one recording per match → introduce a dedicated `match_vods` table.
- If playback performance or compatibility becomes a problem → revisit transcoding / streaming-friendly output formats.
- If external VODs become common → add provider-aware embeds (YouTube/Twitch) instead of simple direct-link fallback.

## Related

- [[0005-private-match-vod-uploads]]
- [[stack]]
- [[status]]
- [[user-flows]]
