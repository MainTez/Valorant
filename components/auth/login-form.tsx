"use client";

import { Chrome, KeyRound, ShieldCheck } from "lucide-react";
import type { TeamMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { GlowButton, glowButtonClasses } from "@/components/auth/glow-button";

export function LoginForm({
  team,
  loading,
  canSubmit,
  errorMessage,
  assistMessage,
  requestAccessHref,
  onGoogleSignIn,
  onVipSignIn,
}: {
  team: TeamMeta | null;
  loading: boolean;
  canSubmit: boolean;
  errorMessage: string | null;
  assistMessage: string | null;
  requestAccessHref: string;
  onGoogleSignIn: () => void;
  onVipSignIn: () => void;
}) {
  const tone = team?.accent ?? "neutral";

  return (
    <section data-login-form className="mx-auto mt-10 w-full max-w-[35rem]">
      <div className="flex items-center justify-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f3bf4c]/55 to-transparent" />
        <span className="text-center text-[0.95rem] font-semibold uppercase tracking-[0.3em] text-[#f3bf4c]">
          Sign In
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f3bf4c]/55 to-transparent" />
      </div>

      <div className="mt-7 space-y-5">
        <p className="text-center text-base leading-7 text-white/62">
          Use your whitelisted Gmail to access the team hub.
        </p>

        <GlowButton
          type="button"
          tone={tone}
          disabled={!canSubmit || loading}
          active={Boolean(canSubmit)}
          className="h-[4.4rem] w-full gap-4 text-[1rem] tracking-[0.24em]"
          onClick={onGoogleSignIn}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1f1f1f]">
            <Chrome className="h-5 w-5" />
          </span>
          {loading ? "Redirecting" : "Continue With Google"}
        </GlowButton>

        <GlowButton
          type="button"
          tone="neutral"
          disabled={!canSubmit || loading}
          active={Boolean(canSubmit)}
          className="h-[4.2rem] w-full gap-4 border-[#f3bf4c]/18 text-[0.92rem] tracking-[0.24em] text-white/92 hover:text-white"
          onClick={onVipSignIn}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#f3bf4c]/28 bg-[#f3bf4c]/10 text-[#f3bf4c]">
            <KeyRound className="h-4.5 w-4.5" />
          </span>
          {loading ? "Redirecting" : "VIP Login"}
        </GlowButton>

        <div className="flex items-start justify-center gap-3 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-center">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#f3bf4c]" />
          <p className="text-sm leading-6 text-white/56">
            Only whitelisted team members can access this hub.
          </p>
        </div>

        <div className="min-h-12 space-y-2 pt-1 text-center">
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-[1rem] border border-[#ff6b6b]/28 bg-[#ff6b6b]/10 px-4 py-3 text-sm text-[#ffd5d5]"
            >
              {errorMessage}
            </p>
          ) : null}
          {!errorMessage && assistMessage ? (
            <p className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
              {assistMessage}
            </p>
          ) : null}
        </div>

        <div className="pt-1 text-center text-[0.76rem] uppercase tracking-[0.28em] text-white/38">
          {team ? (
            <span className={cn(team.accent === "gold" ? "text-[#f7d784]" : "text-[#9ce3ff]")}>
              {team.name} selected
            </span>
          ) : (
            "Select a team above to activate Google sign-in"
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-white/8 pt-8 text-center">
        <p className="text-[0.82rem] uppercase tracking-[0.34em] text-white/36">
          Don&apos;t have access yet?
        </p>
        <div className="mt-5">
          <a
            href={requestAccessHref}
            className={glowButtonClasses({
              tone: "neutral",
              className:
                "min-w-[14rem] px-8 text-white/92 hover:border-[#f3bf4c]/28 hover:text-white",
            })}
          >
            Request Access
          </a>
        </div>
      </div>
    </section>
  );
}
