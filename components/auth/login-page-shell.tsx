import type { ReactNode } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { glowButtonClasses } from "@/components/auth/glow-button";

const SHELL_CUT = "polygon(4% 0, 96% 0, 100% 7%, 100% 93%, 96% 100%, 4% 100%, 0 93%, 0 7%)";

export function LoginPageShell({
  requestAccessHref,
  children,
}: {
  requestAccessHref: string;
  children: ReactNode;
}) {
  return (
    <section className="relative isolate min-h-screen overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[#020305]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,222,150,0.12),transparent_30%),radial-gradient(circle_at_18%_34%,rgba(243,191,76,0.12),transparent_28%),radial-gradient(circle_at_82%_38%,rgba(51,184,255,0.12),transparent_30%),linear-gradient(180deg,rgba(8,10,14,0.2)_0%,rgba(2,3,5,0.95)_100%)]" />
      <div className="pointer-events-none absolute left-[-12rem] top-[18%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(243,191,76,0.22),transparent_70%)] blur-[90px]" />
      <div className="pointer-events-none absolute right-[-14rem] top-[22%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(51,184,255,0.18),transparent_72%)] blur-[95px]" />
      <div className="pointer-events-none absolute inset-x-0 top-[5%] mx-auto h-[40rem] max-w-[86rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      <div
        className="arena-card relative z-10 mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[100rem] flex-col rounded-[2.75rem] border border-white/8 bg-black/35"
        style={{ clipPath: SHELL_CUT }}
      >
        <div
          className="pointer-events-none absolute inset-[1.35rem] rounded-[2.2rem] border border-white/6"
          style={{ clipPath: SHELL_CUT }}
        />
        <span className="pointer-events-none absolute left-8 top-8 h-16 w-16 border-l border-t border-[#f3bf4c]/65" />
        <span className="pointer-events-none absolute right-8 top-8 h-16 w-16 border-r border-t border-[#f3bf4c]/45" />
        <span className="pointer-events-none absolute bottom-8 left-8 h-16 w-16 border-b border-l border-[#f3bf4c]/45" />
        <span className="pointer-events-none absolute bottom-8 right-8 h-16 w-16 border-b border-r border-[#f3bf4c]/65" />

        <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6 lg:px-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 backdrop-blur-xl">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#f3bf4c]/35 bg-[#f3bf4c]/10">
              <ShieldCheck className="h-4 w-4 text-[#f3bf4c]" />
            </div>
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-white/42">
                {APP_NAME}
              </p>
              <p className="text-sm text-white/68">Premium team access portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/download"
              className={glowButtonClasses({
                tone: "neutral",
                className: "px-4 text-white/82 hover:border-[#33b8ff]/28 hover:text-white",
              })}
            >
              <Download className="h-4 w-4" />
              Download App
            </a>
            <a
              href={requestAccessHref}
              className={glowButtonClasses({
                tone: "neutral",
                className: "px-5 text-white/92 hover:border-[#f3bf4c]/28 hover:text-white",
              })}
            >
              Request Access
            </a>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 pt-2 sm:px-8 lg:px-12">
          <div className="w-full max-w-[76rem]">{children}</div>
        </div>
      </div>
    </section>
  );
}
