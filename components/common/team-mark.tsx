/* eslint-disable @next/next/no-img-element */
import { cn, initials } from "@/lib/utils";

interface TeamMarkProps {
  name: string;
  logoUrl?: string | null;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TeamMark({
  active = false,
  className,
  logoUrl,
  name,
  size = "md",
}: TeamMarkProps) {
  const sizeClass =
    size === "sm" ? "h-10 w-10 rounded-lg" : size === "lg" ? "h-[88px] w-[88px] rounded-xl" : "h-14 w-14 rounded-xl";

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden border bg-white/[0.025]",
        active
          ? "border-[color:var(--accent-soft)] text-[color:var(--accent)] shadow-[0_0_24px_-10px_var(--accent)]"
          : "border-white/10 text-[color:var(--color-muted)]",
        sizeClass,
        className,
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-2"
          loading="lazy"
        />
      ) : (
        <span className="font-display text-sm tracking-[0.12em]">{initials(name)}</span>
      )}
    </div>
  );
}
