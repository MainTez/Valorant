import { ShieldHalf } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankBadge({
  rank,
  rr,
  className,
}: {
  rank?: string | null;
  rr?: number | null;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="rounded-md p-1.5 bg-[color:var(--accent-dim)] text-[color:var(--accent)]">
        <ShieldHalf className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg tracking-wide uppercase">
          {rank ?? "Unranked"}
        </div>
        {typeof rr === "number" && Number.isFinite(rr) ? (
          <div className="text-[11px] text-[color:var(--color-muted)] tracking-wider">
            {rr} RR
          </div>
        ) : null}
      </div>
    </div>
  );
}
