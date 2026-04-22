"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type GlowTone = "gold" | "blue" | "neutral";

interface GlowButtonClassOptions {
  tone?: GlowTone;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

export function glowButtonClasses({
  tone = "neutral",
  active = false,
  disabled = false,
  className,
}: GlowButtonClassOptions = {}) {
  const toneClasses =
    tone === "gold"
      ? active
        ? "border-[#f3bf4c] bg-[linear-gradient(180deg,#ffd671_0%,#efb53d_48%,#a26e12_100%)] text-[#0a0906] shadow-[0_18px_38px_-18px_rgba(243,191,76,0.85),0_0_0_1px_rgba(255,220,133,0.24)]"
        : "border-[#8d6b1e] bg-[linear-gradient(180deg,rgba(255,214,113,0.16)_0%,rgba(243,191,76,0.08)_100%)] text-[#f7e6b0] shadow-[0_18px_38px_-22px_rgba(243,191,76,0.55)]"
      : tone === "blue"
        ? active
          ? "border-[#33b8ff] bg-[linear-gradient(180deg,rgba(51,184,255,0.26)_0%,rgba(12,43,71,0.94)_100%)] text-white shadow-[0_18px_38px_-18px_rgba(51,184,255,0.7),0_0_0_1px_rgba(111,214,255,0.2)]"
          : "border-[#1f5071] bg-[linear-gradient(180deg,rgba(12,25,39,0.9)_0%,rgba(6,11,18,0.96)_100%)] text-[#d9f3ff] shadow-[0_18px_38px_-22px_rgba(51,184,255,0.45)]"
        : "border-white/12 bg-white/[0.04] text-white shadow-[0_12px_30px_-22px_rgba(0,0,0,0.85)]";

  return cn(
    "relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-[1rem] border px-6 py-3 text-sm font-semibold uppercase tracking-[0.28em] transition duration-500 ease-out",
    "after:absolute after:inset-x-3 after:bottom-1 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/35 after:to-transparent after:opacity-60",
    !disabled && "hover:-translate-y-0.5 hover:brightness-105",
    disabled && "cursor-not-allowed opacity-50",
    toneClasses,
    className,
  );
}

export function GlowButton({
  tone = "neutral",
  active = false,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: GlowTone;
  active?: boolean;
}) {
  return (
    <button
      className={glowButtonClasses({
        tone,
        active,
        disabled: props.disabled,
        className,
      })}
      {...props}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_56%)] opacity-70" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
