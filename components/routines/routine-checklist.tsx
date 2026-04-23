"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineRow, RoutineProgressRow } from "@/types/domain";

interface Props {
  routine: RoutineRow;
  progress: RoutineProgressRow | null;
  date: string;
}

export function RoutineChecklist({ routine, progress, date }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [completed, setCompleted] = useState<Set<string>>(
    new Set((progress?.completed_items as string[] | undefined) ?? []),
  );
  const items = routine.items ?? [];
  const total = items.length || 1;
  const done = items.filter((i) => completed.has(i.id)).length;
  const ratio = Math.min(1, done / total);

  async function toggle(itemId: string) {
    const nowDone = !completed.has(itemId);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routine_id: routine.id,
          date,
          item_id: itemId,
          done: nowDone,
        }),
      });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      // revert
      setCompleted((prev) => {
        const next = new Set(prev);
        if (nowDone) next.delete(itemId);
        else next.add(itemId);
        return next;
      });
    }
  }

  const C = 52;
  const circumference = 2 * Math.PI * C;
  const offset = circumference * (1 - ratio);

  return (
    <div className="surface p-5 flex flex-col md:flex-row gap-6">
      <div className="flex items-center gap-5">
        <svg width="130" height="130" viewBox="0 0 130 130" className="shrink-0">
          <circle cx="65" cy="65" r={C} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          <circle
            cx="65"
            cy="65"
            r={C}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 65 65)"
            style={{ filter: "drop-shadow(0 0 8px var(--accent-soft))", transition: "stroke-dashoffset 200ms ease" }}
          />
          <text
            x="65"
            y="69"
            textAnchor="middle"
            className="font-display"
            style={{ fill: "var(--color-text)", fontSize: 24, letterSpacing: "0.05em" }}
          >
            {done}/{total}
          </text>
        </svg>
        <div>
          <div className="eyebrow">{routine.scope} routine</div>
          <div className="font-display text-2xl tracking-wide mt-1">{routine.title}</div>
          <div className="text-xs text-[color:var(--color-muted)] mt-1">
            {done === total ? "Routine complete. Lock it in." : `${total - done} left to finish today`}
          </div>
        </div>
      </div>
      <div className="flex-1 grid gap-2">
        {items.map((item) => {
          const isDone = completed.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              disabled={pending}
              className={cn(
                "flex items-center gap-3 text-left p-3 rounded-xl border transition",
                isDone
                  ? "bg-[color:var(--accent-dim)] border-[color:var(--accent-soft)]"
                  : "bg-white/[0.02] border-white/5 hover:border-[color:var(--accent-soft)]",
              )}
            >
              {isDone ? (
                <Check className="h-5 w-5 text-[color:var(--accent)]" />
              ) : (
                <Circle className="h-5 w-5 text-[color:var(--color-muted)]" />
              )}
              <span className="min-w-0 flex-1">
                <span className={cn("block", isDone && "font-semibold")}>{item.label}</span>
                {item.detail ? (
                  <span className="mt-1 block text-xs leading-5 text-[color:var(--color-muted)]">
                    {item.detail}
                  </span>
                ) : null}
                {item.duration || item.tag ? (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {item.duration ? (
                      <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-white/45">
                        {item.duration}
                      </span>
                    ) : null}
                    {item.tag ? (
                      <span className="rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-[color:var(--accent)]">
                        {item.tag}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
