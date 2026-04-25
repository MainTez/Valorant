"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Headphones, Music2, Radio, Unplug } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";

interface TeamSpotifyPlayer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  connected: boolean;
  playing: boolean;
  title: string | null;
  artist: string | null;
  albumArt: string | null;
  url: string | null;
}

interface TeamSpotifyState {
  configured: boolean;
  players: TeamSpotifyPlayer[];
}

export function TeamSpotifyStatus() {
  const [state, setState] = useState<TeamSpotifyState>({ configured: true, players: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/spotify/team", { cache: "no-store" });
        if (!res.ok) throw new Error("spotify_team_failed");
        const data = (await res.json()) as TeamSpotifyState;
        if (alive) setState(data);
      } catch {
        if (alive) setState({ configured: true, players: [] });
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const orderedPlayers = useMemo(() => {
    return [...state.players].sort((a, b) => {
      if (a.playing !== b.playing) return a.playing ? -1 : 1;
      if (a.connected !== b.connected) return a.connected ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [state.players]);

  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-[linear-gradient(180deg,rgba(17,20,27,0.96)_0%,rgba(10,12,17,0.98)_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(30,215,96,0.07),transparent_34%,rgba(255,255,255,0.015)_100%)]" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="eyebrow">Team Music</div>
            <p className="mt-1 text-sm text-white/44">
              Player-linked Spotify status updates every few seconds.
            </p>
          </div>
          <Badge variant={state.configured ? "outline" : "danger"}>
            {state.configured ? `${orderedPlayers.filter((player) => player.playing).length} playing` : "Setup needed"}
          </Badge>
        </div>

        {!state.configured ? (
          <div className="rounded-[1rem] border border-red-400/20 bg-red-400/8 p-4 text-sm text-red-100">
            Spotify credentials are missing, so players cannot connect yet.
          </div>
        ) : loading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-[86px] animate-pulse rounded-[1rem] border border-white/7 bg-white/[0.025]" />
            ))}
          </div>
        ) : orderedPlayers.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-white/10 p-5 text-sm text-white/42">
            No team members found yet.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {orderedPlayers.map((player) => {
              return (
                <div
                  key={player.userId}
                  className="group flex min-h-[126px] flex-col justify-between gap-3 rounded-[1rem] border border-white/7 bg-white/[0.025] p-3 transition hover:border-[#1ed760]/30"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[0.9rem] border border-white/10 bg-white/5">
                      {player.albumArt ? (
                        <Image
                          src={player.albumArt}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center">
                          {player.connected ? (
                            <Music2 className="h-4 w-4 text-[#1ed760]" />
                          ) : (
                            <Unplug className="h-4 w-4 text-white/34" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Avatar className="h-5 w-5 shrink-0">
                          {player.avatarUrl ? (
                            <AvatarImage src={player.avatarUrl} alt={player.displayName} />
                          ) : null}
                          <AvatarFallback className="text-[0.55rem]">
                            {initials(player.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate text-sm font-semibold text-white/82">
                          {player.displayName}
                        </div>
                      </div>
                      <div className="mt-1 truncate text-xs text-white/54">
                        {player.playing
                          ? player.title
                          : player.connected
                            ? "Spotify idle"
                            : "Not linked"}
                      </div>
                      {player.playing && player.artist ? (
                        <div className="mt-0.5 truncate text-[0.68rem] text-white/34">
                          {player.artist}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.8rem] border border-white/8">
                      <Radio className={`h-4 w-4 ${player.playing ? "text-[#1ed760]" : "text-white/28"}`} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[0.66rem] uppercase tracking-[0.18em] text-white/32">
                      {player.playing ? "Live track" : player.connected ? "No music" : "Offline"}
                    </span>
                    {player.playing && player.url ? (
                      <a
                        href={player.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[0.75rem] border border-[#1ed760]/30 bg-[#1ed760]/10 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#83f1ad] transition hover:border-[#1ed760]/55 hover:bg-[#1ed760]/16 hover:text-white active:scale-[0.98]"
                      >
                        <Headphones className="h-3.5 w-3.5" />
                        Listen along
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
