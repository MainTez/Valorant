"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  ExternalLink,
  Film,
  Link2,
  Map as MapIcon,
  Plus,
  Scissors,
  Swords,
  Trash2,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { uploadMatchVod, createVodClip, uploadVodClip } from "@/lib/vods.client";
import {
  MATCH_VOD_MAX_FILE_BYTES,
  VOD_CLIP_MAX_FILE_BYTES,
  formatVideoBytes,
  isDirectVideoUrl,
  resolveMatchVodSource,
} from "@/lib/vods";
import { formatNorwayDateTime } from "@/lib/timezone";
import type { MatchRow, Role, VodClipRow } from "@/types/domain";

interface Props {
  clips: VodClipRow[];
  currentUserId: string;
  currentUserRole: Role;
  matches: MatchRow[];
  teamName: string;
}

interface MatchCreateResponse {
  data?: MatchRow;
  error?: string;
}

type LibraryTab = "vods" | "clips";

export function VodLibrary({
  clips,
  currentUserId,
  currentUserRole,
  matches,
  teamName,
}: Props) {
  const vodMatches = matches.filter((match) => resolveMatchVodSource(match).kind !== "missing");
  const totalVodBytes = vodMatches.reduce(
    (sum, match) => sum + (match.vod_size_bytes ?? 0),
    0,
  );
  const totalClipBytes = clips.reduce((sum, clip) => sum + (clip.size_bytes ?? 0), 0);

  return (
    <Tabs defaultValue="vods" className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard label="Full VODs" value={vodMatches.length} detail="Match reviews" />
        <MetricCard label="Clips" value={clips.length} detail="Round moments" />
        <MetricCard
          label="Stored video"
          value={formatVideoBytes(totalVodBytes + totalClipBytes)}
          detail="Uploaded files only"
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value={"vods" satisfies LibraryTab}>
            <Film className="h-4 w-4" />
            VODs
          </TabsTrigger>
          <TabsTrigger value={"clips" satisfies LibraryTab}>
            <Scissors className="h-4 w-4" />
            Clips
          </TabsTrigger>
        </TabsList>
        <p className="max-w-[32rem] text-sm leading-6 text-[color:var(--color-muted)]">
          Full VODs stay attached to match records. Clips are smaller review moments
          your team can play back without digging through the whole file.
        </p>
      </div>

      <TabsContent value="vods" className="mt-0">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
          <FullVodForm />
          <div className="grid gap-4">
            <div>
              <div className="eyebrow">Library</div>
              <h2 className="mt-1 font-display text-2xl tracking-wide">
                {teamName} full VODs
              </h2>
            </div>
            {vodMatches.length === 0 ? (
              <EmptyPanel
                icon={Film}
                title="No VODs uploaded yet"
                description="Upload a match file or attach an external review link from this page."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                {vodMatches.map((match) => (
                  <VodLibraryCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>
        </section>
      </TabsContent>

      <TabsContent value="clips" className="mt-0">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
          <ClipForm matches={matches} />
          <div className="grid gap-4">
            <div>
              <div className="eyebrow">Clip desk</div>
              <h2 className="mt-1 font-display text-2xl tracking-wide">
                Review moments
              </h2>
            </div>
            {clips.length === 0 ? (
              <EmptyPanel
                icon={Scissors}
                title="No clips saved yet"
                description="Create a clip from an uploaded file or paste a direct video link."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                {clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    canManage={
                      clip.created_by === currentUserId ||
                      currentUserRole === "coach" ||
                      currentUserRole === "admin"
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </TabsContent>
    </Tabs>
  );
}

function FullVodForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    uploadedBytes: number;
    totalBytes: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileValue = form.get("vod_file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    const externalUrl = String(form.get("vod_url") ?? "").trim();

    if (!file && !externalUrl) {
      setError("Upload an MP4 or paste an external VOD URL.");
      return;
    }
    if (file && externalUrl) {
      setError("Choose either an uploaded VOD or an external URL.");
      return;
    }

    setPending(true);
    setUploadProgress(null);
    setMessage(null);
    setError(null);

    let createdMatchId: string | null = null;
    try {
      const response = await fetch("/api/matches", {
        body: JSON.stringify({
          date: String(form.get("date")),
          map: String(form.get("map")).trim(),
          notes: String(form.get("notes") ?? "").trim() || null,
          opponent: String(form.get("opponent")).trim(),
          score_them: Number(form.get("score_them") ?? 0),
          score_us: Number(form.get("score_us") ?? 0),
          type: String(form.get("type")),
          vod_url: externalUrl || null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const body = (await response.json().catch(() => ({}))) as MatchCreateResponse;
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "Failed to create match VOD.");
      }
      createdMatchId = body.data.id;

      if (file) {
        await uploadMatchVod({
          file,
          matchId: body.data.id,
          onProgress: setUploadProgress,
        });
      }

      formRef.current?.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setMessage(file ? "Full VOD uploaded." : "External VOD saved.");
      router.refresh();
    } catch (submitError) {
      if (createdMatchId && file) {
        await fetch(`/api/matches/${createdMatchId}`, { method: "DELETE" }).catch(() => undefined);
      }
      setError(submitError instanceof Error ? submitError.message : "Could not save VOD.");
    } finally {
      setPending(false);
      setUploadProgress(null);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="surface grid h-fit gap-4 p-5">
      <div>
        <div className="eyebrow">Add VOD</div>
        <h2 className="mt-1 font-display text-2xl tracking-wide">Log full review</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
          Upload full MP4 files through resumable Storage or save an external VOD link.
        </p>
      </div>

      <div className="grid gap-3">
        <Field label="Opponent">
          <Input name="opponent" required placeholder="Team name" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Map">
            <Input name="map" required placeholder="Ascent" />
          </Field>
          <Field label="Type">
            <select name="type" defaultValue="scrim" className="vod-native-input">
              <option value="scrim">Scrim</option>
              <option value="official">Official</option>
              <option value="tournament">Tournament</option>
            </select>
          </Field>
        </div>
        <Field label="Date">
          <Input name="date" type="datetime-local" required defaultValue={toDateTimeLocal(new Date())} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Our score">
            <Input name="score_us" type="number" min={0} max={30} defaultValue={0} required />
          </Field>
          <Field label="Their score">
            <Input name="score_them" type="number" min={0} max={30} defaultValue={0} required />
          </Field>
        </div>
        <Field label="MP4 file">
          <Input
            ref={fileInputRef}
            accept=".mp4,video/mp4"
            disabled={pending}
            name="vod_file"
            type="file"
          />
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            Max {formatVideoBytes(MATCH_VOD_MAX_FILE_BYTES)}.
          </p>
        </Field>
        <Field label="External URL">
          <Input name="vod_url" type="url" placeholder="https://..." />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" placeholder="Review focus, comp, or context" />
        </Field>
      </div>

      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
      {uploadProgress ? <UploadProgress progress={uploadProgress} /> : null}

      <Button disabled={pending} type="submit" className="w-full">
        <Upload className="h-4 w-4" />
        {pending ? "Saving VOD..." : "Save full VOD"}
      </Button>
    </form>
  );
}

function UploadProgress({
  progress,
}: {
  progress: { uploadedBytes: number; totalBytes: number };
}) {
  const pct =
    progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.uploadedBytes / progress.totalBytes) * 100))
      : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--color-muted)]">
        <span>Uploading VOD</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xs text-[color:var(--color-muted)]">
        {formatVideoBytes(progress.uploadedBytes)} / {formatVideoBytes(progress.totalBytes)}
      </div>
    </div>
  );
}

function ClipForm({ matches }: { matches: MatchRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceType, setSourceType] = useState<"upload" | "external">("upload");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileValue = form.get("clip_file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
    const externalUrl = String(form.get("external_url") ?? "").trim();
    const startSeconds = nullableNumber(form.get("start_seconds"));
    const endSeconds = nullableNumber(form.get("end_seconds"));
    const matchId = String(form.get("match_id") ?? "") || null;
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const map = String(form.get("map") ?? "").trim() || null;
    const opponent = String(form.get("opponent") ?? "").trim() || null;
    const tags = String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (sourceType === "upload" && !file) {
      setError("Choose a clip file before saving.");
      return;
    }
    if (sourceType === "external" && !externalUrl) {
      setError("Paste a clip URL before saving.");
      return;
    }

    setPending(true);
    setMessage(null);
    setError(null);

    try {
      if (sourceType === "upload" && file) {
        await uploadVodClip({
          description,
          endSeconds,
          file,
          map,
          matchId,
          opponent,
          startSeconds,
          tags,
          title,
        });
      } else {
        await createVodClip({
          description,
          end_seconds: endSeconds,
          external_url: externalUrl,
          map,
          match_id: matchId,
          opponent,
          source_type: "external",
          start_seconds: startSeconds,
          tags,
          title,
        });
      }

      formRef.current?.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSourceType("upload");
      setMessage("Clip saved.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save clip.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="surface grid h-fit gap-4 p-5">
      <div>
        <div className="eyebrow">Add clip</div>
        <h2 className="mt-1 font-display text-2xl tracking-wide">Save a moment</h2>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
          Store a smaller video file or a direct clip link with match context.
        </p>
      </div>

      <Field label="Title">
        <Input name="title" required placeholder="2v4 retake, round 18" />
      </Field>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-white/[0.025] p-1">
        <button
          type="button"
          onClick={() => setSourceType("upload")}
          className={sourceType === "upload" ? "vod-segment active" : "vod-segment"}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setSourceType("external")}
          className={sourceType === "external" ? "vod-segment active" : "vod-segment"}
        >
          Link
        </button>
      </div>

      {sourceType === "upload" ? (
        <Field label="Clip file">
          <Input
            ref={fileInputRef}
            accept=".mp4,.webm,video/mp4,video/webm"
            disabled={pending}
            name="clip_file"
            type="file"
          />
          <p className="mt-1 text-xs text-[color:var(--color-muted)]">
            MP4 or WebM. Max {formatVideoBytes(VOD_CLIP_MAX_FILE_BYTES)}.
          </p>
        </Field>
      ) : (
        <Field label="Clip URL">
          <Input name="external_url" type="url" placeholder="https://..." />
        </Field>
      )}

      <Field label="Related match">
        <select name="match_id" className="vod-native-input" defaultValue="">
          <option value="">No match link</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.opponent} · {match.map} · {formatNorwayDateTime(match.date)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Map">
          <Input name="map" placeholder="Bind" />
        </Field>
        <Field label="Opponent">
          <Input name="opponent" placeholder="Optional" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start sec">
          <Input name="start_seconds" type="number" min={0} placeholder="0" />
        </Field>
        <Field label="End sec">
          <Input name="end_seconds" type="number" min={0} placeholder="45" />
        </Field>
      </div>

      <Field label="Tags">
        <Input name="tags" placeholder="eco, retake, comms" />
      </Field>

      <Field label="Notes">
        <Textarea name="description" placeholder="What should the team notice?" />
      </Field>

      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}

      <Button disabled={pending} type="submit" className="w-full">
        <Plus className="h-4 w-4" />
        {pending ? "Saving clip..." : "Save clip"}
      </Button>
    </form>
  );
}

function VodLibraryCard({ match }: { match: MatchRow }) {
  const source = resolveMatchVodSource(match);

  return (
    <article className="surface grid gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge>{source.kind === "uploaded" ? "Uploaded" : "External"}</Badge>
          <h3 className="mt-3 truncate font-display text-2xl tracking-wide">
            vs {match.opponent}
          </h3>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 text-right">
          <div className="font-display text-xl tracking-wide">
            {match.score_us}-{match.score_them}
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
            {match.result}
          </div>
        </div>
      </div>

      <div className="grid gap-2 text-sm text-[color:var(--color-muted)] sm:grid-cols-2">
        <Meta icon={MapIcon}>{match.map}</Meta>
        <Meta icon={Calendar}>{formatNorwayDateTime(match.date)}</Meta>
        <Meta icon={Swords}>{match.type}</Meta>
        <Meta icon={Film}>
          {match.vod_size_bytes ? formatVideoBytes(match.vod_size_bytes) : "External"}
        </Meta>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href={`/vods/${match.id}`}>Open VOD</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/matches/${match.id}`}>Match details</Link>
        </Button>
      </div>
    </article>
  );
}

function ClipCard({ canManage, clip }: { canManage: boolean; clip: VodClipRow }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const playable =
    clip.source_type === "upload" ||
    (clip.external_url ? isDirectVideoUrl(clip.external_url) : false);

  async function onDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/vod-clips/${clip.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete clip.");
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="surface overflow-hidden">
      {playable ? (
        <video
          className="aspect-video w-full bg-black object-cover"
          controls
          preload="metadata"
          src={`/api/vod-clips/${clip.id}/media`}
        />
      ) : (
        <div className="grid aspect-video place-items-center bg-black/35 p-5 text-center">
          <div>
            <Link2 className="mx-auto h-8 w-8 text-[color:var(--accent)]" />
            <p className="mt-3 text-sm text-[color:var(--color-muted)]">
              External clip link
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge>{clip.source_type === "upload" ? "Uploaded clip" : "External clip"}</Badge>
            <h3 className="mt-3 font-display text-2xl tracking-wide">{clip.title}</h3>
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deleting}
              onClick={onDelete}
              aria-label="Delete clip"
              className="text-red-200 hover:text-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {clip.description ? (
          <p className="text-sm leading-6 text-[color:var(--color-muted)]">
            {clip.description}
          </p>
        ) : null}

        <div className="grid gap-2 text-sm text-[color:var(--color-muted)] sm:grid-cols-2">
          {clip.map ? <Meta icon={MapIcon}>{clip.map}</Meta> : null}
          {clip.opponent ? <Meta icon={Swords}>{clip.opponent}</Meta> : null}
          <Meta icon={Clock}>{formatClipWindow(clip)}</Meta>
          <Meta icon={Film}>{clip.size_bytes ? formatVideoBytes(clip.size_bytes) : "Link"}</Meta>
        </div>

        {clip.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {clip.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-muted)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {clip.external_url ? (
          <a
            href={clip.external_url}
            rel="noreferrer"
            target="_blank"
            className="inline-flex w-fit items-center gap-2 text-sm text-[color:var(--accent)] hover:underline"
          >
            Open source <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </label>
  );
}

function MetricCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="surface p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl tracking-wide">{value}</div>
      <div className="mt-1 text-xs text-[color:var(--color-muted)]">{detail}</div>
    </div>
  );
}

function EmptyPanel({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="surface grid min-h-[260px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-white/8 bg-white/[0.025]">
          <Icon className="h-5 w-5 text-[color:var(--accent)]" />
        </div>
        <h3 className="mt-4 font-display text-2xl tracking-wide">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-[color:var(--color-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function Meta({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--accent)]" />
      <span className="truncate capitalize">{children}</span>
    </div>
  );
}

function InlineMessage({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "error" | "success";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-lg border border-red-400/20 bg-red-400/8 px-3 py-2 text-sm text-red-200"
          : "rounded-lg border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-sm text-emerald-100"
      }
    >
      {children}
    </div>
  );
}

function nullableNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateTimeLocal(date: Date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatClipWindow(clip: VodClipRow) {
  if (clip.start_seconds === null && clip.end_seconds === null) return "Full clip";
  const start = clip.start_seconds ?? 0;
  if (clip.end_seconds === null) return `${formatSeconds(start)} start`;
  return `${formatSeconds(start)} - ${formatSeconds(clip.end_seconds)}`;
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
