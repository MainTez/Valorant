import { cn } from "@/lib/utils";
import type { TeamSlug } from "@/lib/constants";

interface Props {
  team: TeamSlug;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * CSS-only esports emblem that picks up the team accent via the
 * CSS custom properties set on <html data-team=...>. Keeps the
 * bundle lean and scales crisp at any size.
 */
export function TeamEmblem({ team, size = "md", className }: Props) {
  const px = size === "sm" ? 32 : size === "md" ? 56 : 96;
  const label = team === "surf-n-bulls" ? "SB" : "MG";
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl font-display font-extrabold select-none",
        className,
      )}
      style={{
        width: px,
        height: px,
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(0,0,0,0.3))",
        border: "1px solid var(--accent-soft)",
        boxShadow:
          "inset 0 0 22px var(--accent-dim), 0 0 22px -4px var(--accent-soft)",
      }}
    >
      <span
        style={{
          fontSize: px * 0.4,
          letterSpacing: "0.03em",
          backgroundImage:
            "linear-gradient(170deg, #fffaf0 0%, var(--accent) 55%, rgba(0,0,0,0.6) 120%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {label}
      </span>
    </div>
  );
}
