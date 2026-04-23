"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadMatchVod } from "@/lib/vods.client";
import { MATCH_VOD_MAX_FILE_BYTES } from "@/lib/vods";

interface Props {
  externalVodUrl: string | null;
  initialError?: string | null;
  matchId: string;
  uploadedVodHref: string | null;
  vodDetailHref: string | null;
  vodOriginalName: string | null;
  vodSizeBytes: number | null;
}

export function MatchVodManager({
  externalVodUrl,
  initialError,
  matchId,
  uploadedVodHref,
  vodDetailHref,
  vodOriginalName,
  vodSizeBytes,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [message, setMessage] = useState<string | null>(null);

  const hasUploadedVod = Boolean(uploadedVodHref);
  const hasAnyVod = hasUploadedVod || Boolean(externalVodUrl);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose an MP4 file before uploading.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);

    try {
      await uploadMatchVod({ file, matchId });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(hasUploadedVod ? "VOD replaced." : "VOD uploaded.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/matches/${matchId}/vod`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to remove VOD.");
      }
      setMessage("VOD removed.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove VOD.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="surface p-5 grid gap-4">
      <div>
        <div className="eyebrow">VOD manager</div>
        <p className="mt-2 text-sm text-[color:var(--color-muted)] max-w-2xl">
          Upload one MP4 per match to private Supabase Storage. Playback now happens inside the app,
          while the raw file still uses a short-lived signed URL.
        </p>
      </div>

      {hasAnyVod ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-medium">{vodOriginalName ?? (hasUploadedVod ? "Uploaded VOD" : "External VOD")}</div>
            <div className="text-[color:var(--color-muted)]">
              {vodSizeBytes ? formatBytes(vodSizeBytes) : hasUploadedVod ? "Uploaded file" : "External link"}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {vodDetailHref ? (
              <Link className="text-[color:var(--accent)] hover:underline" href={vodDetailHref}>
                Watch in app
              </Link>
            ) : null}
            {hasUploadedVod && uploadedVodHref ? (
              <a
                className="text-[color:var(--accent)] hover:underline"
                href={uploadedVodHref}
                rel="noreferrer"
                target="_blank"
              >
                Open raw file
              </a>
            ) : null}
            {!hasUploadedVod && externalVodUrl ? (
              <a
                className="text-[color:var(--accent)] hover:underline"
                href={externalVodUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open external link
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {externalVodUrl ? (
        <p className="text-sm text-[color:var(--color-muted)]">
          This match already has an external VOD link. Uploading an MP4 will replace that link.
        </p>
      ) : null}

      <form className="grid gap-3 max-w-xl" onSubmit={onSubmit}>
        <div className="grid gap-1.5">
          <Label htmlFor={`vod-file-${matchId}`}>{hasUploadedVod ? "Replace MP4" : "Upload MP4"}</Label>
          <Input
            ref={fileInputRef}
            accept=".mp4,video/mp4"
            disabled={pending}
            id={`vod-file-${matchId}`}
            name="vod_file"
            type="file"
          />
          <p className="text-xs text-[color:var(--color-muted)]">
            MP4 only. Max {formatBytes(MATCH_VOD_MAX_FILE_BYTES)}.
          </p>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {message ? <p className="text-sm text-green-400">{message}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={pending} type="submit">
            {pending ? (hasUploadedVod ? "Replacing…" : "Uploading…") : hasUploadedVod ? "Replace VOD" : "Upload VOD"}
          </Button>
          {hasUploadedVod ? (
            <Button disabled={pending} onClick={onDelete} type="button" variant="ghost">
              Remove upload
            </Button>
          ) : null}
        </div>
      </form>
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
