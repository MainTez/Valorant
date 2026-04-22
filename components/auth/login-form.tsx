"use client";

import type { TeamMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { glowButtonClasses } from "@/components/auth/glow-button";

export function LoginForm({
  team,
  loading,
  canSubmit,
  errorMessage,
  assistMessage,
  requestAccessHref,
  onSubmit,
}: {
  team: TeamMeta | null;
  loading: boolean;
  canSubmit: boolean;
  errorMessage: string | null;
  assistMessage: string | null;
  requestAccessHref: string;
  onSubmit: () => void;
}) {
  const tone = team?.accent ?? "neutral";

  return (
    <section data-login-form className="mx-auto mt-10 w-full max-w-[35rem]">
      <div className="flex items-center justify-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f3bf4c]/55 to-transparent" />
        <span className="text-center text-[0.95rem] font-semibold uppercase tracking-[0.3em] text-[#f3bf4c]">
          Login To Your Account
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f3bf4c]/55 to-transparent" />
      </div>

      <div className="mt-7 space-y-4">
        <p className="text-center text-base text-white/60">
          Use your whitelisted Gmail account to continue.
        </p>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loading}
          className={cn(
            glowButtonClasses({
              tone,
              active: Boolean(canSubmit),
              disabled: !canSubmit || loading,
              className:
                "h-[4.4rem] w-full text-[1.02rem] tracking-[0.22em]",
            }),
            "gap-4",
          )}
        >
          <span className="relative z-10 flex items-center gap-4">
            <GoogleMark />
            <span>{loading ? "Redirecting To Google" : "Continue With Google"}</span>
          </span>
        </button>

        <div className="min-h-12 space-y-2 pt-2 text-center">
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

        <div className="pt-2 text-center text-[0.76rem] uppercase tracking-[0.28em] text-white/38">
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

function GoogleMark() {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[1.05rem] font-bold text-[#4285f4] shadow-[0_8px_20px_-12px_rgba(255,255,255,0.65)]">
      G
    </span>
  );
}
