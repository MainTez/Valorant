"use client";

import Image from "next/image";
import { TEAMS, type TeamMeta, type TeamSlug } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { glowButtonClasses } from "@/components/auth/glow-button";

const PANEL_CUT = "polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%)";

export function TeamCard({
  team,
  selected,
  onSelect,
}: {
  team: TeamMeta;
  selected: boolean;
  onSelect: (team: TeamSlug) => void;
}) {
  const isGold = team.accent === "gold";
  const borderColor = isGold ? "rgba(243,191,76,0.7)" : "rgba(51,184,255,0.64)";
  const glowColor = isGold ? "rgba(243,191,76,0.34)" : "rgba(51,184,255,0.34)";
  const shadowColor = isGold ? "rgba(243,191,76,0.24)" : "rgba(51,184,255,0.28)";

  return (
    <button
      type="button"
      aria-pressed={selected}
      data-card
      onClick={() => onSelect(team.slug)}
      className={cn(
        "group relative isolate flex min-h-[29rem] w-full flex-col justify-between overflow-hidden rounded-[2rem] p-5 text-left transition duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050608]",
        selected ? "scale-[1.015]" : "scale-100 hover:scale-[1.01]",
      )}
      style={{
        clipPath: PANEL_CUT,
        background: isGold
          ? "linear-gradient(180deg, rgba(19,16,9,0.98) 0%, rgba(7,6,5,0.96) 100%)"
          : "linear-gradient(180deg, rgba(7,18,30,0.98) 0%, rgba(4,9,16,0.97) 100%)",
        boxShadow: selected
          ? `0 0 0 1px ${borderColor}, 0 34px 80px -42px ${shadowColor}, inset 0 0 42px ${glowColor}`
          : `0 24px 70px -48px ${shadowColor}, inset 0 0 24px ${glowColor}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-[1px] rounded-[1.9rem]"
        style={{
          clipPath: PANEL_CUT,
          border: `1px solid ${selected ? borderColor : "rgba(255,255,255,0.1)"}`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-28 blur-3xl"
        style={{
          background: isGold
            ? "radial-gradient(circle, rgba(243,191,76,0.36), transparent 68%)"
            : "radial-gradient(circle, rgba(51,184,255,0.32), transparent 68%)",
        }}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-80 transition duration-500",
          isGold
            ? "bg-[radial-gradient(circle_at_50%_20%,rgba(243,191,76,0.18),transparent_40%),linear-gradient(180deg,transparent_40%,rgba(243,191,76,0.08)_100%)]"
            : "bg-[radial-gradient(circle_at_50%_20%,rgba(51,184,255,0.24),transparent_40%),linear-gradient(180deg,transparent_38%,rgba(16,71,126,0.14)_100%)]",
        )}
      />
      <span
        className="pointer-events-none absolute left-6 top-6 h-10 w-10 border-l border-t"
        style={{ borderColor }}
      />
      <span
        className="pointer-events-none absolute bottom-6 right-6 h-10 w-10 border-b border-r"
        style={{ borderColor }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.36em] text-white/42">
          {selected ? "Selected Team" : "Team Access"}
        </span>
        <span
          className={cn(
            "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em]",
            isGold
              ? "border-[#f3bf4c]/30 bg-[#f3bf4c]/10 text-[#f6d27f]"
              : "border-[#33b8ff]/30 bg-[#33b8ff]/10 text-[#9ce3ff]",
          )}
        >
          {team.shortName}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-3 pt-5">
        <div
          data-crest
          className={cn(
            "mx-auto flex w-full items-center justify-center transition duration-700",
            selected ? "scale-100 opacity-100" : "scale-[0.96] opacity-95",
          )}
        >
          <div className="relative flex w-full items-center justify-center">
            <Image
              src={
                team.slug === "molgarians"
                  ? "/teams/molgarians-logo.png"
                  : "/teams/surf-n-bulls-logo.png"
              }
              alt={`${team.name} logo`}
              width={team.slug === "molgarians" ? 687 : 552}
              height={team.slug === "molgarians" ? 899 : 758}
              priority
              className={cn(
                "h-auto object-contain drop-shadow-[0_0_30px_rgba(0,0,0,0.75)]",
                team.slug === "molgarians"
                  ? "max-h-[18rem] w-full max-w-[15rem]"
                  : "max-h-[17rem] w-full max-w-[14rem] brightness-[1.14] contrast-[1.08] saturate-[1.18] drop-shadow-[0_0_36px_rgba(51,184,255,0.32)]",
              )}
            />
          </div>
        </div>

        <div className="mt-2 text-center">
          <h2
            className={cn(
              "font-display text-[clamp(2.4rem,4vw,3.5rem)] uppercase italic leading-none tracking-[0.04em]",
              isGold ? "text-gold-metal" : "text-metal",
            )}
          >
            {team.name}
          </h2>
          <p className="mx-auto mt-3 max-w-[20rem] text-sm leading-6 text-white/48">
            {team.pitch}
          </p>
        </div>
      </div>

      <div className="relative z-10 px-3 pb-3">
        <span
          className={glowButtonClasses({
            tone: team.accent,
            active: selected,
            className: "w-full",
          })}
        >
          {selected ? "Team Selected" : "Select Team"}
        </span>
      </div>
    </button>
  );
}

export function TeamCards({
  selectedTeam,
  onSelect,
}: {
  selectedTeam: TeamSlug | null;
  onSelect: (team: TeamSlug) => void;
}) {
  return (
    <div
      data-team-grid
      className="mx-auto grid w-full max-w-[68rem] gap-6 lg:grid-cols-2"
    >
      {[TEAMS.molgarians, TEAMS["surf-n-bulls"]].map((team) => (
        <TeamCard
          key={team.slug}
          team={team}
          selected={selectedTeam === team.slug}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
