import { Suspense } from "react";
import { LoginCard } from "./login-card";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main className="relative z-10 min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden lg:flex flex-col items-center justify-center text-center px-10 py-16 border-r border-[color:var(--accent-soft)]/40">
        <div className="max-w-md">
          <div
            className="mx-auto mb-8 grid place-items-center rounded-[36%_36%_45%_45%] border-4 border-[color:var(--accent)] shadow-[0_0_35px_rgba(243,191,76,0.4),inset_0_0_35px_rgba(243,191,76,0.2)]"
            style={{ width: "clamp(220px, 34vw, 440px)", aspectRatio: "1" }}
          >
            <span
              className="font-display font-extrabold select-none"
              style={{
                fontSize: "clamp(4rem, 10vw, 7rem)",
                backgroundImage:
                  "linear-gradient(170deg, #fffaf0 0%, var(--accent) 45%, rgba(0,0,0,0.7) 130%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              NX
            </span>
          </div>
          <h1 className="font-display tracking-[0.1em] text-3xl sm:text-4xl">
            ONE TEAM. ONE MIND.
            <span className="accent-text block mt-2">ONE GOAL.</span>
          </h1>
          <p className="mt-4 text-[color:var(--color-muted)]">
            Built for victory. Driven by discipline.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 lg:py-16">
        <Suspense fallback={null}>
          <LoginCard searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
