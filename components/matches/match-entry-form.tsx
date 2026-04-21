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

export function MatchEntryForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      opponent: String(form.get("opponent") ?? ""),
      type: String(form.get("type") ?? "scrim") as "scrim" | "official" | "tournament",
      date: String(form.get("date") ?? ""),
      map: String(form.get("map") ?? ""),
      score_us: Number(form.get("score_us") ?? 0),
      score_them: Number(form.get("score_them") ?? 0),
      notes: String(form.get("notes") ?? "") || null,
      vod_url: String(form.get("vod_url") ?? "") || null,
    };
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      router.push("/matches");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
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
      <Field label="VOD URL (optional)">
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
          {pending ? "Saving…" : "Log match"}
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
