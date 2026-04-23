import Image from "next/image";
import { ShieldHalf } from "lucide-react";
import { getCompetitiveTierAsset, getRankTheme, resolveTierId } from "@/lib/valorant/ranks";
import { cn } from "@/lib/utils";

export function RankBadge({
  rank,
  tierId,
  rr,
  className,
}: {
  rank?: string | null;
  tierId?: number | null;
  rr?: number | null;
  className?: string;
}) {
  const resolvedTierId = resolveTierId(tierId, rank);
  const asset = getCompetitiveTierAsset(resolvedTierId);
  const theme = getRankTheme(resolvedTierId, rank);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border"
        style={{
          borderColor: theme.ring,
          background: `linear-gradient(180deg, ${theme.accentSoft} 0%, rgba(255,255,255,0.02) 100%)`,
          boxShadow: `inset 0 0 24px ${theme.accentSoft}`,
        }}
      >
        {asset ? (
          <Image
            src={asset.smallIcon}
            alt={rank ?? "Rank emblem"}
            width={34}
            height={34}
            className="drop-shadow-[0_0_18px_rgba(0,0,0,0.4)]"
          />
        ) : (
          <ShieldHalf className="h-4 w-4" />
        )}
      </div>
      <div className="leading-tight">
        <div className="font-display text-lg tracking-wide uppercase" style={{ color: theme.accent }}>
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
