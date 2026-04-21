"use client";

import { use, useState } from "react";
import { Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAMS } from "@/lib/constants";
import { TeamEmblem } from "@/components/common/team-emblem";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TeamKey = keyof typeof TEAMS;

export function LoginCard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = use(searchParams);
  const errorCode = typeof params.error === "string" ? params.error : null;

  const [team, setTeam] = useState<TeamKey>("surf-n-bulls");
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setLocalErr(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?team=${team}`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) setLocalErr(error.message);
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const errorMessage =
    localErr ??
    (errorCode === "not_whitelisted"
      ? "This email is not on the team whitelist. Contact an admin."
      : errorCode === "oauth_failed"
        ? "Sign-in failed. Please try again."
        : errorCode === "missing_email"
          ? "Google did not return an email for this account."
          : null);

  return (
    <div className="w-full max-w-md">
      <div className="surface-accent p-8 animate-slide-up">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-4 w-4 accent-text" />
          <span className="eyebrow">Private Team Hub</span>
        </div>
        <h2 className="font-display text-4xl tracking-wider">
          WELCOME <span className="accent-text">BACK</span>
        </h2>
        <p className="mt-3 text-[color:var(--color-muted)]">
          Choose your team and sign in with your whitelisted email.
        </p>

        <div className="mt-6">
          <div className="eyebrow mb-3 text-center">Select your team</div>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(TEAMS) as TeamKey[]).map((slug) => {
              const meta = TEAMS[slug];
              const active = team === slug;
              return (
                <button
                  key={slug}
                  data-team={slug}
                  onClick={() => setTeam(slug)}
                  className={cn(
                    "group text-left p-4 rounded-xl border bg-white/[0.02] transition-all",
                    active
                      ? "border-[color:var(--accent)] shadow-[0_0_0_1px_var(--accent-soft),0_18px_40px_-20px_rgba(0,0,0,0.6)]"
                      : "border-white/10 hover:border-[color:var(--accent-soft)]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <TeamEmblem team={slug} size="sm" />
                    <div>
                      <div className="font-display text-base tracking-wide">
                        {meta.name}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)]">
                        {meta.accent} accent
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[color:var(--color-muted)] mt-3 line-clamp-2">
                    {meta.motto}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="my-6 h-px bg-white/5" />

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full h-12 rounded-xl border border-[color:var(--accent-soft)] bg-gradient-to-b from-white/5 to-white/[0.02] text-[color:var(--color-text)] flex items-center justify-center gap-3 font-display tracking-[0.1em] text-lg hover:border-[color:var(--accent)] disabled:opacity-50 transition"
        >
          <GoogleG />
          {loading ? "REDIRECTING…" : "SIGN IN WITH GOOGLE"}
        </button>

        {errorMessage ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3">
          <InfoCard icon={<ShieldCheck className="h-4 w-4 accent-text" />}>
            <div className="font-display tracking-wider uppercase text-sm">
              Access is restricted to approved members.
            </div>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              If you should have access, contact your team captain or admin.
            </p>
          </InfoCard>
          <InfoCard icon={<Lock className="h-4 w-4 accent-text" />}>
            <div className="font-display tracking-wider uppercase text-sm">
              Secure. Private. Built for champions.
            </div>
            <p className="text-xs text-[color:var(--color-muted)] mt-1">
              Your data, strats, and comms are locked to your team.
            </p>
          </InfoCard>
        </div>
      </div>

      <p className="text-center text-xs text-[color:var(--color-muted)] mt-6">
        © {new Date().getFullYear()} Nexus Team Hub. All rights reserved.
      </p>
    </div>
  );
}

function InfoCard({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function GoogleG() {
  return (
    <span className="h-7 w-7 rounded-full bg-white grid place-items-center text-[#4385f4] text-base font-bold select-none">
      G
    </span>
  );
}
