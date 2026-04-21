"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, initials, relativeTime } from "@/lib/utils";
import type { TaskRow, UserRow } from "@/types/domain";

interface Props {
  tasks: TaskRow[];
  members: Array<Pick<UserRow, "id" | "display_name" | "email" | "avatar_url">>;
  currentUserId: string;
}

type Status = "backlog" | "in_progress" | "done";
const STATUSES: Array<{ key: Status; label: string }> = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export function TaskBoard({ tasks, members }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const byStatus: Record<Status, TaskRow[]> = {
    backlog: [],
    in_progress: [],
    done: [],
  };
  for (const t of tasks) byStatus[t.status].push(t);

  async function move(task: TaskRow, dir: -1 | 1) {
    const idx = STATUSES.findIndex((s) => s.key === task.status);
    const next = STATUSES[idx + dir];
    if (!next) return;
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status: next.key }),
    });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function remove(task: TaskRow) {
    const res = await fetch(`/api/tasks?id=${task.id}`, { method: "DELETE" });
    if (res.ok) startTransition(() => router.refresh());
  }

  async function createTask(formData: FormData) {
    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? "") || null,
      priority: (formData.get("priority") as "low" | "med" | "high") ?? "med",
      assignee_id: (() => {
        const v = formData.get("assignee_id");
        return v && v !== "none" ? String(v) : null;
      })(),
    };
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setOpen(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create task</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTask(new FormData(e.currentTarget));
              }}
              className="grid gap-3"
            >
              <div className="grid gap-1.5">
                <Label>Title</Label>
                <Input name="title" required placeholder="e.g. Review Ascent defense" />
              </div>
              <div className="grid gap-1.5">
                <Label>Description</Label>
                <Textarea name="description" placeholder="Context, acceptance, notes…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue="med">
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
                  <Label>Assignee</Label>
                  <Select name="assignee_id" defaultValue="none">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.display_name ?? m.email.split("@")[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map((col) => {
          const colTasks = byStatus[col.key];
          return (
            <div key={col.key} className="surface p-4 min-h-[300px] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base tracking-wider uppercase">
                    {col.label}
                  </span>
                  <Badge variant="outline">{colTasks.length}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {colTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 p-4 text-xs text-[color:var(--color-muted)] text-center">
                    No tasks here
                  </div>
                ) : (
                  colTasks.map((t) => {
                    const assignee = members.find((m) => m.id === t.assignee_id);
                    return (
                      <div
                        key={t.id}
                        className="rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:border-[color:var(--accent-soft)] transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm">{t.title}</div>
                          <Badge
                            variant={
                              t.priority === "high"
                                ? "danger"
                                : t.priority === "low"
                                  ? "outline"
                                  : "warning"
                            }
                          >
                            {t.priority}
                          </Badge>
                        </div>
                        {t.description ? (
                          <p className="text-xs text-[color:var(--color-muted)] mt-1 line-clamp-3">
                            {t.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {assignee ? (
                              <div className="h-6 w-6 rounded-full bg-white/5 grid place-items-center text-[10px]">
                                {initials(assignee.display_name ?? assignee.email)}
                              </div>
                            ) : (
                              <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                                unassigned
                              </span>
                            )}
                            <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                              {relativeTime(t.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => move(t, -1)}
                              disabled={pending || col.key === "backlog"}
                              aria-label="Move left"
                              className={cn(
                                "p-1 rounded border border-white/5 text-[color:var(--color-muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent-soft)] disabled:opacity-30 disabled:cursor-not-allowed",
                              )}
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => move(t, 1)}
                              disabled={pending || col.key === "done"}
                              aria-label="Move right"
                              className={cn(
                                "p-1 rounded border border-white/5 text-[color:var(--color-muted)] hover:text-[color:var(--accent)] hover:border-[color:var(--accent-soft)] disabled:opacity-30 disabled:cursor-not-allowed",
                              )}
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => remove(t)}
                              disabled={pending}
                              aria-label="Delete"
                              className="p-1 rounded border border-white/5 text-[color:var(--color-muted)] hover:text-red-400 hover:border-red-500/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
