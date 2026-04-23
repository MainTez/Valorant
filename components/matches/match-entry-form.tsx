"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAPS } from "@/lib/constants";
import { uploadMatchVod } from "@/lib/vods.client";
import { MATCH_VOD_MAX_FILE_BYTES, assertValidMatchVodUpload } from "@/lib/vods";

interface CreateMatchResponse {
  data?: {
    id: string;
  };
  error?: string;
}

export function MatchEntryForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const vodFileValue = form.get("vod_file");
    const vodFile = vodFileValue instanceof File && vodFileValue.size > 0 ? vodFileValue : null;
    const vodUrl = String(form.get("vod_url") ?? "").trim() || null;

    try {
      if (vodFile && vodUrl) {
        throw new Error("Choose either an MP4 upload or an external VOD URL.");
      }

      if (vodFile) {
        assertValidMatchVodUpload({
          contentType: vodFile.type,
          fileName: vodFile.name,
          fileSize: vodFile.size,
        });
      }

      const payload = {
        date: String(form.get("date") ?? ""),
        map: String(form.get("map") ?? ""),
        notes: String(form.get("notes") ?? "") || null,
        opponent: String(form.get("opponent") ?? ""),
        score_them: Number(form.get("score_them") ?? 0),
        score_us: Number(form.get("score_us") ?? 0),
        type: String(form.get("type") ?? "scrim") as "scrim" | "official" | "tournament",
        vod_url: vodUrl,
      };

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as CreateMatchResponse;
      if (!res.ok || !body.data) {
        throw new Error(body.error ?? "Save failed");
      }

      if (vodFile) {
        try {
          await uploadMatchVod({ file: vodFile, matchId: body.data.id });
        } catch (uploadError) {
          const message = uploadError instanceof Error ? uploadError.message : "VOD upload failed.";
          router.push(`/matches/${body.data.id}?vodUploadError=${encodeURIComponent(message)}`);
          router.refresh();
          return;
        }
      }

      router.push(`/matches/${body.data.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface p-5 grid gap-4 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Opponent">
          <Input name="opponent" required placeholder="e.g. Eclipse" />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue="scrim">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scrim">Scrim</SelectItem>
              <SelectItem value="official">Official</SelectItem>
              <SelectItem value="tournament">Tournament</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Date & time">
          <Input name="date" type="datetime-local" required />
        </Field>
        <Field label="Map">
          <Select name="map" defaultValue="Ascent">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAPS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Score (us — them)">
          <div className="flex items-center gap-2">
            <Input name="score_us" type="number" min={0} max={30} defaultValue={13} required />
            <span className="text-[color:var(--color-muted)]">—</span>
            <Input name="score_them" type="number" min={0} max={30} defaultValue={0} required />
          </div>
        </Field>
      </div>
      <Field label="Upload MP4 (optional)">
        <Input name="vod_file" type="file" accept=".mp4,video/mp4" />
      </Field>
      <p className="-mt-2 text-xs text-[color:var(--color-muted)]">
        MP4 only. Max {formatBytes(MATCH_VOD_MAX_FILE_BYTES)}. Leave empty if you want to paste an external link instead.
      </p>
      <Field label="External VOD URL (optional)">
        <Input name="vod_url" type="url" placeholder="https://…" />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" placeholder="Macro, errors, key rounds…" />
      </Field>
      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Log Match"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
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
