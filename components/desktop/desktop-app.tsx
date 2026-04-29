"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MonitorUp, Radio, Settings, ShieldCheck, Volume2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MomentCard } from "@/components/desktop/moment-card";
import type { DesktopMoment } from "@/components/desktop/types";

interface DesktopAppProps {
  initialMoments: DesktopMoment[];
  teamId: string;
  teamName: string;
  userName: string;
}

interface SyncResponse {
  data?: {
    synced: boolean;
    reason: string;
    moments: DesktopMoment[];
  };
  error?: string;
}

export function DesktopApp({ initialMoments, teamId, teamName, userName }: DesktopAppProps) {
  const [moments, setMoments] = useState(initialMoments);
  const [lastSync, setLastSync] = useState<string>("Ready");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPending, startTransition] = useTransition();
  const seenRef = useRef(new Set(initialMoments.map((moment) => moment.id)));

  const mergeMoments = useCallback((next: DesktopMoment[], showOverlay: boolean) => {
    if (next.length === 0) return;

    const fresh = next.filter((moment) => !seenRef.current.has(moment.id));
    for (const moment of fresh) seenRef.current.add(moment.id);

    if (fresh.length > 0) {
      setMoments((current) =>
        [...fresh, ...current]
          .filter((moment, index, all) => all.findIndex((item) => item.id === moment.id) === index)
          .slice(0, 80),
      );

      if (showOverlay) {
        for (const moment of fresh.slice().reverse()) {
          window.nexusDesktop?.showMoment({ ...moment, sound_enabled: soundEnabled });
        }
      }
    }
  }, [soundEnabled]);

  const syncNow = useCallback(async (showOverlay = true) => {
    try {
      const res = await fetch("/api/desktop/sync", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as SyncResponse;
      if (!res.ok) throw new Error(body.error ?? "Sync failed");

      mergeMoments(body.data?.moments ?? [], showOverlay);
      setLastSync(body.data?.reason === "fresh" ? "Synced recently" : "Synced now");
    } catch (err) {
      setLastSync(err instanceof Error ? err.message : "Sync failed");
    }
  }, [mergeMoments]);

  useEffect(() => {
    const stored = window.localStorage.getItem("desktop-sound-enabled");
    if (stored != null) setSoundEnabled(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem("desktop-sound-enabled", soundEnabled ? "1" : "0");
  }, [soundEnabled]);

  useEffect(() => {
    void syncNow(false);
    const timer = window.setInterval(() => {
      void syncNow(true);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [syncNow]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`desktop-moments:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_moments",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => mergeMoments([payload.new as DesktopMoment], true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mergeMoments, teamId]);

  const latest = moments[0] ?? null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#030407] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(255,82,110,0.18),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(246,196,83,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_45%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-5 px-6 py-6">
        <header className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.28em] text-white/42">
              <Radio className="h-4 w-4 text-[color:var(--accent)]" />
              Desktop live feed
            </div>
            <h1 className="mt-3 font-display text-[clamp(2.5rem,5vw,5.4rem)] uppercase leading-[0.88] tracking-[0.03em]">
              {teamName}
              <span className="block text-white/28">match radar</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/52">
              Signed in as {userName}. The app polls completed Valorant matches, creates savage
              team moments, and throws a desktop overlay with sound when someone finishes a game.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSoundEnabled((value) => !value)}
            >
              <Volume2 className="h-4 w-4" />
              Sound {soundEnabled ? "on" : "off"}
            </Button>
            <Button
              type="button"
              onClick={() => startTransition(() => void syncNow(true))}
              disabled={isPending}
            >
              <MonitorUp className="h-4 w-4" />
              Sync now
            </Button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="surface-accent relative overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="eyebrow">Latest overlay</span>
              <span className="text-xs uppercase tracking-[0.2em] text-white/38">{lastSync}</span>
            </div>
            {latest ? (
              <MomentCard moment={latest} />
            ) : (
              <div className="grid min-h-[320px] place-items-center rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.02] text-center">
                <div>
                  <ShieldCheck className="mx-auto h-9 w-9 text-[color:var(--accent)]" />
                  <h2 className="mt-4 font-display text-3xl uppercase tracking-[0.05em]">
                    Waiting for matches
                  </h2>
                  <p className="mt-2 text-sm text-white/46">
                    Keep the app running in tray. New completed matches will show here.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="surface p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">App controls</span>
              <Settings className="h-4 w-4 text-white/34" />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-white/58">
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-4">
                <div className="font-semibold text-white">Overlay behavior</div>
                <p className="mt-1">Every linked teammate match triggers a post-match overlay.</p>
              </div>
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-4">
                <div className="font-semibold text-white">Safe integration</div>
                <p className="mt-1">
                  This app does not inject into Valorant or touch Vanguard. It uses match sync data.
                </p>
              </div>
              <Link href="/dashboard" className="btn-ghost justify-center">
                Open web dashboard
              </Link>
            </div>
          </aside>
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="eyebrow">Moment history</span>
            <span className="text-xs uppercase tracking-[0.2em] text-white/36">
              {moments.length} events
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {moments.slice(0, 8).map((moment) => (
              <MomentCard key={moment.id} moment={moment} compact />
            ))}
            {moments.length === 0 ? (
              <p className="text-sm text-white/46">No match moments yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
