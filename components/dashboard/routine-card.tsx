import { Check, Circle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { RoutineRow, RoutineProgressRow } from "@/types/domain";

interface Props {
  routine: RoutineRow | null;
  progress: RoutineProgressRow | null;
}

export function RoutineCard({ routine, progress }: Props) {
  const items = routine?.items ?? [];
  const completed = new Set(progress?.completed_items ?? []);
  const total = items.length || 1;
  const done = items.filter((i) => completed.has(i.id)).length;
  const ratio = Math.min(1, done / total);
  const C = 44;
  const circumference = 2 * Math.PI * C;
  const offset = circumference * (1 - ratio);

  return (
    <div className="surface p-5 h-full flex flex-col">
      <div className="eyebrow">Today&rsquo;s Routine</div>
      <div className="flex-1 mt-3 flex items-center gap-4">
        <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
          <circle
            cx="55"
            cy="55"
            r={C}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <circle
            cx="55"
            cy="55"
            r={C}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ filter: "drop-shadow(0 0 6px var(--accent-soft))" }}
          />
          <text
            x="55"
            y="58"
            textAnchor="middle"
            className="font-display"
            style={{ fill: "var(--color-text)", fontSize: 22, letterSpacing: "0.04em" }}
          >
            {done}/{total}
          </text>
        </svg>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          {items.slice(0, 5).map((item) => {
            const isDone = completed.has(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isDone
                    ? "text-[color:var(--color-text)]"
                    : "text-[color:var(--color-muted)]",
                )}
              >
                {isDone ? (
                  <Check className="h-4 w-4 text-[color:var(--accent)]" />
                ) : (
                  <Circle className="h-4 w-4 text-[color:var(--color-muted)]" />
                )}
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <Link
        href="/routines"
        className="mt-4 btn-ghost justify-center text-[color:var(--accent)]"
      >
        View Routine
      </Link>
    </div>
  );
}
