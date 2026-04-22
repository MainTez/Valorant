import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TeamSlug } from "@/lib/constants";

interface Props {
  team: TeamSlug;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const TEAM_LOGOS: Record<
  TeamSlug,
  { src: string; width: number; height: number; glowClass: string; frameClass: string }
> = {
  molgarians: {
    src: "/teams/molgarians-logo.png",
    width: 687,
    height: 899,
    glowClass: "drop-shadow-[0_0_20px_rgba(243,191,76,0.38)]",
    frameClass:
      "bg-[radial-gradient(circle_at_50%_30%,rgba(243,191,76,0.16),transparent_62%)]",
  },
  "surf-n-bulls": {
    src: "/teams/surf-n-bulls-logo.png",
    width: 552,
    height: 758,
    glowClass: "drop-shadow-[0_0_22px_rgba(51,184,255,0.34)]",
    frameClass:
      "bg-[radial-gradient(circle_at_50%_30%,rgba(51,184,255,0.14),transparent_62%)]",
  },
};

export function TeamEmblem({ team, size = "md", className }: Props) {
  const px = size === "sm" ? 38 : size === "md" ? 62 : size === "lg" ? 104 : 236;
  const logo = TEAM_LOGOS[team];

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-visible",
        className,
      )}
      style={{ width: px, height: px }}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-[6%] rounded-full blur-2xl",
          logo.frameClass,
        )}
      />
      <Image
        src={logo.src}
        alt=""
        aria-hidden="true"
        width={logo.width}
        height={logo.height}
        priority={size === "xl"}
        className={cn(
          "relative z-10 h-auto max-h-full w-auto max-w-full object-contain",
          logo.glowClass,
        )}
      />
    </div>
  );
}
