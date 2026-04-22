"use client";

import { use, useEffect, useRef, useState, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LoginPageShell } from "@/components/auth/login-page-shell";
import { HeroHeader } from "@/components/auth/hero-header";
import { TeamCards } from "@/components/auth/team-card";
import { LoginForm } from "@/components/auth/login-form";
import { TEAMS, teamBySlug, type TeamSlug } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const REQUEST_ACCESS_HREF =
  "mailto:danilebnen@gmail.com?subject=Esport%20Hub%20Access%20Request";

function firstParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function searchErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case "not_whitelisted":
      return "This email is not on the approved roster yet. Use Request Access below.";
    case "oauth_failed":
      return "The sign-in flow did not complete. Try again from the login page.";
    case "server_config":
      return "Authentication reached the app, but the server is missing required Supabase configuration.";
    case "callback_failed":
      return "Authentication returned to the app, but the server-side callback failed.";
    case "missing_email":
      return "Your authentication provider did not return an email address for this account.";
    case "team_mismatch":
      return "This account is approved for a different team than the one currently selected.";
    default:
      return null;
  }
}

function bootstrapErrorMessage(errorCode: unknown) {
  switch (errorCode) {
    case "team_required":
      return "Choose your team before logging in.";
    case "not_whitelisted":
      return "This email is not approved for roster access yet.";
    case "team_mismatch":
      return "This account belongs to a different team.";
    case "unauthorized":
      return "Your session was not ready after authentication. Try again.";
    default:
      return "We could not finish team access verification. Try again.";
  }
}

export function LoginCard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = use(searchParams);
  const queryError = firstParam(params.error);
  const queryTeam = teamBySlug(firstParam(params.team))?.slug ?? null;

  const rootRef = useRef<HTMLDivElement>(null);
  const [team, setTeam] = useState<TeamSlug | null>(queryTeam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [ignoreSearchError, setIgnoreSearchError] = useState(false);
  const [assistMessage, setAssistMessage] = useState<string | null>(
    "Select your team first, then log in with your approved account.",
  );

  useEffect(() => {
    setIgnoreSearchError(false);
  }, [queryError]);

  useEffect(() => {
    if (queryTeam) {
      setTeam(queryTeam);
      return;
    }

    if (typeof window === "undefined") return;
    const storedTeam = teamBySlug(window.localStorage.getItem("selectedTeam"))?.slug ?? null;
    if (storedTeam) {
      setTeam(storedTeam);
      setAssistMessage(`${TEAMS[storedTeam].name} restored. Continue with your approved account.`);
    }
  }, [queryTeam]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (team) {
      document.body.dataset.team = team;
      window.localStorage.setItem("selectedTeam", team);
    } else {
      delete document.body.dataset.team;
      window.localStorage.removeItem("selectedTeam");
    }

    return () => {
      delete document.body.dataset.team;
    };
  }, [team]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro.from("[data-hero-item]", {
        y: 26,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
      });

      gsap.from("[data-card]", {
        y: 48,
        opacity: 0,
        scale: 0.92,
        duration: 1.05,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-team-grid]",
          start: "top 84%",
        },
      });

      gsap.fromTo(
        "[data-tag-word]",
        { opacity: 0.14, yPercent: 20 },
        {
          opacity: 1,
          yPercent: 0,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top 85%",
            end: "bottom 45%",
            scrub: true,
          },
        },
      );

      gsap.fromTo(
        "[data-crest]",
        { scale: 0.82, opacity: 0.45 },
        {
          scale: 1,
          opacity: 1,
          duration: 1.1,
          ease: "power2.out",
          stagger: 0.14,
          scrollTrigger: {
            trigger: "[data-team-grid]",
            start: "top 78%",
            end: "bottom 50%",
            scrub: 0.45,
          },
        },
      );

      gsap.from("[data-login-form]", {
        y: 38,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-login-form]",
          start: "top 88%",
        },
      });
    },
    { scope: rootRef },
  );

  const selectedTeam = team ? TEAMS[team] : null;
  const errorMessage =
    localErr ?? (!ignoreSearchError ? searchErrorMessage(queryError) : null);
  const canSubmit = Boolean(team && email.trim() && password);

  function handleTeamSelect(nextTeam: TeamSlug) {
    setIgnoreSearchError(true);
    setTeam(nextTeam);
    setLocalErr(null);
    setAssistMessage(`${TEAMS[nextTeam].name} selected. Continue with your approved credentials.`);
  }

  function handleForgotPassword() {
    setIgnoreSearchError(true);
    setLocalErr(null);
    setAssistMessage(
      email.trim()
        ? "Password resets are currently handled by team admins. Use Request Access below if you need one."
        : "Enter your approved email first, then use Request Access if you need an admin reset.",
    );
  }

  function handleEmailChange(value: string) {
    setIgnoreSearchError(true);
    setLocalErr(null);
    setEmail(value);
  }

  function handlePasswordChange(value: string) {
    setIgnoreSearchError(true);
    setLocalErr(null);
    setPassword(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!team || !email.trim() || !password) return;

    setLoading(true);
    setIgnoreSearchError(true);
    setLocalErr(null);
    setAssistMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLocalErr(
          error.message === "Invalid login credentials"
            ? "Invalid email or password."
            : error.message,
        );
        return;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setLocalErr("Authentication succeeded, but no session token was returned.");
        return;
      }

      const response = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ team }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        team?: string;
      };

      if (!response.ok) {
        await supabase.auth.signOut();
        if (payload.error === "team_mismatch" && payload.team) {
          const assignedTeam = teamBySlug(payload.team)?.name;
          setLocalErr(
            assignedTeam
              ? `This account is approved for ${assignedTeam}, not ${TEAMS[team].name}.`
              : bootstrapErrorMessage(payload.error),
          );
          return;
        }

        setLocalErr(bootstrapErrorMessage(payload.error));
        return;
      }

      setAssistMessage(`${TEAMS[team].name} verified. Redirecting to the hub...`);
      window.location.assign("/dashboard");
    } catch (error) {
      setLocalErr(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginPageShell requestAccessHref={REQUEST_ACCESS_HREF}>
      <div ref={rootRef} className="relative mx-auto flex w-full flex-col items-center">
        <HeroHeader />

        <div className="mt-10 w-full">
          <TeamCards selectedTeam={team} onSelect={handleTeamSelect} />
        </div>

        <LoginForm
          team={selectedTeam}
          email={email}
          password={password}
          showPassword={showPassword}
          loading={loading}
          canSubmit={canSubmit}
          errorMessage={errorMessage}
          assistMessage={assistMessage}
          requestAccessHref={REQUEST_ACCESS_HREF}
          onEmailChange={handleEmailChange}
          onPasswordChange={handlePasswordChange}
          onTogglePassword={() => setShowPassword((current) => !current)}
          onForgotPassword={handleForgotPassword}
          onSubmit={handleSubmit}
        />
      </div>
    </LoginPageShell>
  );
}
