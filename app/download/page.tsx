import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownToLine, BellRing, MonitorDown, ShieldCheck, Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { DESKTOP_APP_URL, DESKTOP_DOWNLOAD_URL } from "@/lib/downloads";

export const metadata: Metadata = {
  title: "Download Desktop App",
  description: "Install the Nexus Team Hub desktop app for live match callouts.",
};

const FEATURES = [
  {
    icon: BellRing,
    title: "Live post-match callouts",
    body: "Finished matches become team feed moments like CARRIED ALL!!, INTED MATCH, or a clean win/loss note.",
  },
  {
    icon: Sparkles,
    title: "Overlay without game injection",
    body: "The app reads synced match data from the hub and shows its own desktop overlay. It does not touch Valorant or Vanguard.",
  },
  {
    icon: ShieldCheck,
    title: "Same private team login",
    body: "Players still use the whitelisted account flow, so the desktop app follows the same team isolation as the website.",
  },
];

export default function DownloadPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#030406] px-5 py-6 text-white sm:px-8 lg:px-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_16%,rgba(51,184,255,0.16),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(243,191,76,0.14),transparent_28%),linear-gradient(135deg,rgba(9,12,18,0.2),rgba(2,3,5,0.95))]" />
      <div className="absolute left-[-12rem] top-24 h-[30rem] w-[30rem] rounded-full bg-[#33b8ff]/12 blur-[110px]" />
      <div className="absolute bottom-[-14rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[#f3bf4c]/12 blur-[120px]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 py-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-xl transition hover:border-[#f3bf4c]/35 hover:text-white"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-[#f3bf4c]/30 bg-[#f3bf4c]/10 text-[#f3bf4c]">
              N
            </span>
            {APP_NAME}
          </Link>
          <a
            href={DESKTOP_APP_URL}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/72 transition hover:border-white/20 hover:text-white"
          >
            Open Web App
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_0.78fr] lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#33b8ff]/25 bg-[#33b8ff]/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8cdcff]">
              <MonitorDown className="h-4 w-4" />
              Windows desktop build
            </div>
            <h1 className="mt-7 max-w-3xl font-display text-6xl font-extrabold uppercase leading-[0.88] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
              Install the team app.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
              Use the desktop version when you want the app to feel native: tray launch,
              match feed polling, and loud performance callouts after teammates finish games.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={DESKTOP_DOWNLOAD_URL}
                className="group inline-flex items-center gap-3 rounded-2xl border border-[#f3bf4c]/40 bg-[#f3bf4c] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_22px_70px_-32px_rgba(243,191,76,0.9)] transition hover:-translate-y-0.5 hover:bg-[#ffd66d]"
              >
                <ArrowDownToLine className="h-5 w-5 transition group-hover:translate-y-0.5" />
                Download for Windows
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white/78 transition hover:border-white/20 hover:text-white"
              >
                Sign in first
              </Link>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-white/38">
              If Windows SmartScreen warns you, choose “More info” and run it. The app is
              private-team software and release signing can be upgraded later.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(155deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] p-4 shadow-[0_34px_100px_-60px_rgba(51,184,255,0.8)] backdrop-blur-xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#070a10] p-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/38">
                      Desktop Feed
                    </p>
                    <p className="mt-1 text-lg font-bold">Latest match moment</p>
                  </div>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                    Live
                  </span>
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-[#f3bf4c]/30 bg-[linear-gradient(135deg,rgba(243,191,76,0.18),rgba(255,255,255,0.03))] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f3bf4c]">
                    CARRIED ALL!!
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-display text-4xl font-extrabold uppercase leading-none">
                        Johan
                      </p>
                      <p className="mt-2 text-sm text-white/54">Won 13-7 on Ascent</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-5xl font-extrabold text-white">327</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/42">ACS</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <article
                        key={feature.title}
                        className="rounded-[1rem] border border-white/8 bg-white/[0.025] p-4"
                      >
                        <Icon className="h-5 w-5 text-[#33b8ff]" />
                        <h2 className="mt-3 text-sm font-bold text-white">{feature.title}</h2>
                        <p className="mt-2 text-xs leading-5 text-white/45">{feature.body}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
