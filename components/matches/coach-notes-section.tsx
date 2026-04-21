"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/utils";
import type { CoachNoteRow, UserRow } from "@/types/domain";

interface Props {
  matchId: string;
  notes: Array<CoachNoteRow & { author?: Pick<UserRow, "display_name" | "email"> | null }>;
  canWrite: boolean;
}

export function CoachNotesSection({ matchId, notes, canWrite }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/coach-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, body }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed");
      }
      setDraft("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[color:var(--accent)]" />
        <div className="eyebrow">Coach Notes</div>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {notes.length === 0 ? (
          <p className="text-sm text-[color:var(--color-muted)]">
            No notes yet.
          </p>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {n.author?.display_name ?? n.author?.email?.split("@")[0] ?? "Coach"}
                </span>
                <span className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
                  {relativeTime(n.created_at)}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-line">{n.body}</p>
            </div>
          ))
        )}
      </div>
      {canWrite ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a coach note…"
          />
          <div className="flex items-center justify-between">
            {error ? <span className="text-xs text-red-400">{error}</span> : <span />}
            <Button type="submit" size="sm" disabled={pending || !draft.trim()}>
              {pending ? "Posting…" : "Post note"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
