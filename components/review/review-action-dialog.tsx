"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildReviewActionDescription,
  type ReviewActionSource,
} from "@/lib/review-actions";
import type { UserRow } from "@/types/domain";

type ReviewActionMember = Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">;

interface Props {
  canCreate: boolean;
  members: ReviewActionMember[];
  source: ReviewActionSource;
}

export function ReviewActionDialog({ canCreate, members, source }: Props) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high">("med");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canCreate) return null;

  const defaultTitle = `Fix: ${source.label}`;

  async function createAction(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim() || defaultTitle;
    const note = String(formData.get("note") ?? "").trim();
    if (!assigneeId) {
      setError("Assign a player before creating the action.");
      return;
    }
    if (!note) {
      setError("Write what needs fixing first.");
      return;
    }

    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/tasks", {
        body: JSON.stringify({
          assignee_id: assigneeId,
          description: buildReviewActionDescription({ body: note, source }),
          priority,
          title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not create review action.");
        return;
      }

      setMessage("Review action assigned.");
      startTransition(() => router.refresh());
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create review action.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setError(null);
          setMessage(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wrench className="h-4 w-4" />
          Fix this
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create review action</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            createAction(new FormData(event.currentTarget));
          }}
        >
          <div className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-sm">
            <div className="text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
              Source
            </div>
            <div className="mt-1 font-semibold">{source.label}</div>
            {source.meta?.length ? (
              <div className="mt-1 text-xs text-[color:var(--color-muted)]">
                {source.meta.join(" · ")}
              </div>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`review-title-${source.type}-${source.href}`}>Title</Label>
            <Input
              defaultValue={defaultTitle}
              id={`review-title-${source.type}-${source.href}`}
              maxLength={140}
              name="title"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Assign player</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose player" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.display_name ?? member.email.split("@")[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`review-note-${source.type}-${source.href}`}>What should they fix?</Label>
            <Textarea
              id={`review-note-${source.type}-${source.href}`}
              name="note"
              placeholder="Example: Stop re-peeking before utility lands. Wait for flash, then swing together."
              required
            />
            <p className="text-xs text-[color:var(--color-muted)]">
              This becomes a task and appears in that player's routine actions until it is done.
            </p>
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {message ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-sm text-emerald-100">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </span>
              <Link href="/tasks" className="text-xs text-[color:var(--accent)] hover:underline">
                Open tasks
              </Link>
            </div>
          ) : null}

          <DialogFooter>
            <Button disabled={submitting || refreshing || !assigneeId} type="submit">
              {submitting ? "Assigning..." : "Assign fix"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
