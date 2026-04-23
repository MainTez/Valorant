"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMatchVodPlayback } from "@/lib/vods.client";
import type { MatchVodPlaybackData } from "@/lib/vods";

interface Props {
  matchId: string;
}

export function VodPlayer({ matchId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);
  const [playback, setPlayback] = useState<MatchVodPlaybackData | null>(null);

  const loadPlayback = useCallback(async () => {
    setPending(true);
    setError(null);

    try {
      const data = await fetchMatchVodPlayback(matchId);
      setPlayback(data);
    } catch (playbackError) {
      setPlayback(null);
      setError(playbackError instanceof Error ? playbackError.message : "Failed to load VOD.");
    } finally {
      setPending(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadPlayback();
  }, [loadPlayback]);

  return (
    <section className="surface p-5 grid gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">VOD Player</div>
          <p className="mt-2 text-sm text-[color:var(--color-muted)] max-w-2xl">
            Watch the uploaded match VOD inline. Signed playback URLs are short-lived, so refresh the
            source if playback expires.
          </p>
        </div>
        <Button disabled={pending} onClick={() => void loadPlayback()} size="sm" type="button" variant="outline">
          <RefreshCcw className="h-4 w-4" />
          Refresh source
        </Button>
      </div>

      {pending ? (
        <p className="text-sm text-[color:var(--color-muted)]">Loading VOD…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : playback?.kind === "uploaded" ? (
        <div className="grid gap-3">
          <video
            key={playback.signedUrl}
            className="w-full rounded-2xl border border-white/10 bg-black aspect-video"
            controls
            playsInline
            preload="metadata"
            src={playback.signedUrl}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
            <div className="text-[color:var(--color-muted)]">
              {playback.fileName ?? "Uploaded VOD"}
              {playback.sizeBytes ? ` · ${formatBytes(playback.sizeBytes)}` : ""}
            </div>
            <a
              className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline"
              href={playback.signedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open raw file <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : playback?.kind === "external" && playback.isDirectVideo ? (
        <div className="grid gap-3">
          <video
            key={playback.url}
            className="w-full rounded-2xl border border-white/10 bg-black aspect-video"
            controls
            playsInline
            preload="metadata"
            src={playback.url}
          />
          <a
            className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline text-sm"
            href={playback.url}
            rel="noreferrer"
            target="_blank"
          >
            Open external file <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : playback?.kind === "external" ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[color:var(--color-muted)]">
            This VOD is an external link and cannot be embedded inline here.
          </p>
          <a
            className="inline-flex items-center gap-1 text-[color:var(--accent)] hover:underline"
            href={playback.url}
            rel="noreferrer"
            target="_blank"
          >
            Open external VOD <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--color-muted)]">No VOD attached to this match yet.</p>
      )}
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  }).format(value)} ${units[exponent]}`;
}
