import { Gauge, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrackerScore } from "@/lib/stats/tracker-score";

interface Props {
  score: TrackerScore;
  compact?: boolean;
  className?: string;
}

export function TrackerScoreBadge({ score, compact = false, className }: Props) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-[0.9rem] border border-white/10 bg-[linear-gradient(115deg,rgba(22,27,35,0.96)_0%,rgba(10,15,22,0.96)_58%,rgba(214,167,74,0.12)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        compact ? "px-3 py-3" : "px-4 py-4",
        className,
      )}
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: score.accent }}
      />
      <div className="absolute -left-8 top-1/2 h-24 w-24 -translate-y-1/2 rotate-45 border border-white/10 bg-white/[0.025]" />
      <div
        className="absolute -bottom-10 right-6 h-24 w-24 rounded-full blur-3xl"
        style={{ backgroundColor: `${score.accent}22` }}
      />

      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            "grid shrink-0 place-items-center rounded-[0.75rem] border border-white/10 bg-black/24 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
            compact ? "h-12 w-12" : "h-14 w-14",
          )}
        >
          <Gauge className={cn(compact ? "h-5 w-5" : "h-6 w-6")} style={{ color: score.accent }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/52">
              Tracker Score
            </div>
            <Info className="h-3.5 w-3.5 shrink-0 text-white/38" />
          </div>

          <div className="mt-1 flex items-end gap-1">
            <span
              className={cn(
                "font-display leading-none tracking-[0.02em] text-white",
                compact ? "text-[2rem]" : "text-[2.65rem]",
              )}
            >
              {score.value}
            </span>
            <span className="mb-1.5 text-sm font-semibold text-white/50">/1000</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] uppercase tracking-[0.16em] text-white/42">
            <span style={{ color: score.accent }}>{score.label}</span>
            <span className="h-1 w-1 rounded-full bg-white/24" />
            <span>{score.confidenceLabel}</span>
          </div>

          <div className="mt-2 h-1.5 rounded-full bg-white/8">
            <div
              className="h-full rounded-full"
              style={{
                width: `${score.value / 10}%`,
                background: `linear-gradient(90deg, ${score.accent} 0%, rgba(255,255,255,0.72) 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
