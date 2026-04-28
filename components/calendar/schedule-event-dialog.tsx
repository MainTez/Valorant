"use client";

import { useId, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ScheduleEventRow, UserRow } from "@/types/domain";

type ScheduleKind = ScheduleEventRow["kind"];
type ScheduleMember = Pick<UserRow, "id" | "display_name" | "email">;

interface ScheduleEventDialogProps {
  event?: ScheduleEventRow;
  members: ScheduleMember[];
}

interface ScheduleResponse {
  error?: string;
}

const EVENT_KINDS: Array<{ value: ScheduleKind; label: string }> = [
  { value: "practice", label: "Practice" },
  { value: "scrim", label: "Scrim" },
  { value: "match", label: "Match" },
  { value: "review", label: "Review" },
  { value: "custom", label: "Custom" },
];

export function ScheduleEventDialog({ event, members }: ScheduleEventDialogProps) {
  const router = useRouter();
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ScheduleKind>(event?.kind ?? "practice");
  const [participantIds, setParticipantIds] = useState<string[]>(event?.participants ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const isEditing = Boolean(event);
  const busy = saving || deleting || refreshing;

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setKind(event?.kind ?? "practice");
      setParticipantIds(event?.participants ?? []);
      setError(null);
    }
  }

  function toggleParticipant(id: string) {
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((participantId) => participantId !== id)
        : [...current, id],
    );
  }

  async function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSaving(true);
    setError(null);

    const formElement = submitEvent.currentTarget;
    const formData = new FormData(formElement);

    try {
      const payload = {
        ...(event ? { id: event.id } : {}),
        title: String(formData.get("title") ?? ""),
        kind,
        start_at: toIsoString(String(formData.get("start_at") ?? "")),
        end_at: optionalIsoString(String(formData.get("end_at") ?? "")),
        participants: participantIds,
        description: String(formData.get("description") ?? "") || null,
        location: String(formData.get("location") ?? "") || null,
      };

      const response = await fetch("/api/schedule-events", {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as ScheduleResponse;
      if (!response.ok) {
        throw new Error(body.error ?? "Save failed");
      }

      if (!event) {
        formElement.reset();
        setKind("practice");
        setParticipantIds([]);
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!event || !window.confirm("Delete this schedule event?")) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/schedule-events?id=${event.id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => ({}))) as ScheduleResponse;
      if (!response.ok) {
        throw new Error(body.error ?? "Delete failed");
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : (
          <Button type="button">
            <CalendarPlus className="h-4 w-4" />
            New event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit schedule event" : "Create schedule event"}</DialogTitle>
          <DialogDescription>
            Coaches and admins can schedule practice, scrims, matches, reviews, and team events.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
            <Field label="Title" htmlFor={`${idPrefix}-title`}>
              <Input
                id={`${idPrefix}-title`}
                name="title"
                required
                maxLength={140}
                defaultValue={event?.title ?? ""}
                placeholder="e.g. Split defense review"
              />
            </Field>

            <Field label="Type" htmlFor={`${idPrefix}-kind`}>
              <Select value={kind} onValueChange={(value) => setKind(value as ScheduleKind)}>
                <SelectTrigger id={`${idPrefix}-kind`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {EVENT_KINDS.map((eventKind) => (
                      <SelectItem key={eventKind.value} value={eventKind.value}>
                        {eventKind.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Start" htmlFor={`${idPrefix}-start`}>
              <Input
                id={`${idPrefix}-start`}
                name="start_at"
                type="datetime-local"
                required
                defaultValue={toDateTimeLocal(event?.start_at ?? defaultStartAt())}
              />
            </Field>
            <Field label="End (optional)" htmlFor={`${idPrefix}-end`}>
              <Input
                id={`${idPrefix}-end`}
                name="end_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(event?.end_at ?? null)}
              />
            </Field>
          </div>

          <Field label="Location (optional)" htmlFor={`${idPrefix}-location`}>
            <Input
              id={`${idPrefix}-location`}
              name="location"
              maxLength={140}
              defaultValue={event?.location ?? ""}
              placeholder="Discord, VCT room, local arena..."
            />
          </Field>

          <div className="grid gap-2">
            <Label>Participants (optional)</Label>
            {members.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-[color:var(--color-muted)]">
                Add team members first to assign participants.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.map((member) => {
                  const selected = participantIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleParticipant(member.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        selected
                          ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                          : "border-white/10 bg-white/[0.02] text-[color:var(--color-muted)] hover:border-white/20 hover:text-[color:var(--color-text)]",
                      )}
                    >
                      {member.display_name ?? member.email.split("@")[0]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Field label="Description (optional)" htmlFor={`${idPrefix}-description`}>
            <Textarea
              id={`${idPrefix}-description`}
              name="description"
              maxLength={2000}
              defaultValue={event?.description ?? ""}
              placeholder="Focus areas, prep notes, links..."
            />
          </Field>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <DialogFooter className="flex-wrap justify-between">
            {event ? (
              <Button type="button" variant="danger" onClick={deleteEvent} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={busy}>
              {saving ? "Saving..." : isEditing ? "Save changes" : "Create event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function defaultStartAt(): string {
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour.toISOString();
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toIsoString(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Start time must be a valid date");
  }
  return date.toISOString();
}

function optionalIsoString(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("End time must be a valid date");
  }
  return date.toISOString();
}
