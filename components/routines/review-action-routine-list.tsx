"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, PlayCircle, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseReviewActionDescription } from "@/lib/review-actions";
import { relativeTime } from "@/lib/utils";
import type { TaskRow } from "@/types/domain";

interface Props {
  tasks: TaskRow[];
}

export function ReviewActionRoutineList({ tasks }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (tasks.length === 0) return null;

  async function updateStatus(task: TaskRow, status: TaskRow["status"]) {
    const response = await fetch("/api/tasks", {
      body: JSON.stringify({ id: task.id, status }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    });

    if (response.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <section className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow inline-flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[color:var(--accent)]" />
            Review actions
          </div>
          <h2 className="mt-1 font-display text-2xl tracking-wide">
            Fix list from match review
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--color-muted)]">
            These are assigned from matches, VODs, and clips. Mark them done when the fix is locked in.
          </p>
        </div>
        <Badge variant="outline">{tasks.length} open</Badge>
      </div>

      <div className="mt-4 grid gap-2">
        {tasks.map((task) => {
          const reviewAction = parseReviewActionDescription(task.description);
          return (
            <div
              key={task.id}
              className="rounded-xl border border-white/8 bg-white/[0.025] p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "danger"
                          : task.priority === "low"
                            ? "outline"
                            : "warning"
                      }
                    >
                      {task.priority}
                    </Badge>
                    <span className="text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                      {task.status.replace("_", " ")} · {relativeTime(task.created_at)}
                    </span>
                  </div>
                  {reviewAction?.body ? (
                    <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
                      {reviewAction.body}
                    </p>
                  ) : null}
                  {reviewAction?.href ? (
                    <Link
                      href={reviewAction.href}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-[color:var(--accent)] hover:underline"
                    >
                      {reviewAction.label ?? "Open source"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {task.status === "backlog" ? (
                    <Button
                      disabled={pending}
                      onClick={() => updateStatus(task, "in_progress")}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Start
                    </Button>
                  ) : null}
                  <Button
                    disabled={pending}
                    onClick={() => updateStatus(task, "done")}
                    size="sm"
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Done
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
