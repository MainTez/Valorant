"use client";

import type { FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import type { TeamMeta } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { GlowButton, glowButtonClasses } from "@/components/auth/glow-button";

export function LoginForm({
  team,
  email,
  password,
  showPassword,
  loading,
  canSubmit,
  errorMessage,
  assistMessage,
  requestAccessHref,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onForgotPassword,
  onSubmit,
}: {
  team: TeamMeta | null;
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  canSubmit: boolean;
  errorMessage: string | null;
  assistMessage: string | null;
  requestAccessHref: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onForgotPassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
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

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <label className="metal-input flex h-16 items-center gap-4 rounded-[1rem] px-5">
          <Mail className="h-5 w-5 shrink-0 text-white/45" />
          <input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="Username or Email"
            className="h-full w-full bg-transparent text-lg text-white outline-none placeholder:text-white/34"
          />
        </label>

        <label className="metal-input flex h-16 items-center gap-4 rounded-[1rem] px-5">
          <Lock className="h-5 w-5 shrink-0 text-white/45" />
          <input
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Password"
            className="h-full w-full bg-transparent text-lg text-white outline-none placeholder:text-white/34"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/52 transition hover:bg-white/5 hover:text-white"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </label>

        <div className="pt-3">
          <GlowButton
            type="submit"
            tone={tone}
            disabled={!canSubmit || loading}
            active={Boolean(canSubmit)}
            className="h-[4.4rem] w-full text-[1.05rem] tracking-[0.26em]"
          >
            {loading ? "Authenticating" : "Login"}
          </GlowButton>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[1.02rem] text-[#f0c45f] transition hover:text-[#ffd98a]"
          >
            Forgot Password?
          </button>
        </div>

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
            "Select a team above to activate login"
          )}
        </div>
      </form>

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
