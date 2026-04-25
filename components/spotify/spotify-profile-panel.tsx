"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Link2, Music2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SpotifyProfileState {
  configured: boolean;
  connected: boolean;
  playing: boolean;
  title: string | null;
  artist: string | null;
  albumArt: string | null;
  url: string | null;
}

const DEFAULT_STATE: SpotifyProfileState = {
  configured: true,
  connected: false,
  playing: false,
  title: null,
  artist: null,
  albumArt: null,
  url: null,
};

interface Props {
  status?: string | null;
}

export function SpotifyProfilePanel({ status }: Props) {
  const [state, setState] = useState<SpotifyProfileState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/spotify/current", { cache: "no-store" });
        if (!res.ok) throw new Error("spotify_current_failed");
        const data = (await res.json()) as SpotifyProfileState;
        if (alive) setState({ ...DEFAULT_STATE, ...data });
      } catch {
        if (alive) setState(DEFAULT_STATE);
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

  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-[linear-gradient(180deg,rgba(16,19,25,0.96)_0%,rgba(10,12,17,0.98)_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(30,215,96,0.08),transparent_38%,rgba(255,255,255,0.015)_100%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Spotify Link</div>
            <p className="mt-1 max-w-[42rem] text-sm leading-6 text-white/48">
              Connect your own Spotify account so the roster can detect when you
              are playing music.
            </p>
          </div>
          {loading ? (
            <Badge variant="outline">Checking</Badge>
          ) : state.configured && state.connected ? (
            <Badge variant={state.playing ? "success" : "outline"}>
              {state.playing ? "Playing" : "Idle"}
            </Badge>
          ) : (
            <Badge variant={state.configured ? "warning" : "danger"}>
              {state.configured ? "Not linked" : "Setup needed"}
            </Badge>
          )}
        </div>

        {status ? (
          <div
            className={`rounded-[0.9rem] border px-4 py-3 text-sm ${
              status === "connected"
                ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100"
                : "border-amber-300/20 bg-amber-300/8 text-amber-100"
            }`}
          >
            {spotifyStatusMessage(status)}
          </div>
        ) : null}

        <div className="flex items-center gap-4 rounded-[1rem] border border-white/7 bg-white/[0.025] p-4">
          <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[1rem] border border-white/10 bg-white/5">
            {state.albumArt ? (
              <Image
                src={state.albumArt}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : state.configured ? (
              <Music2 className="h-5 w-5 text-[#1ed760]" />
            ) : (
              <Unplug className="h-5 w-5 text-white/45" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg tracking-[0.04em]">
              {loading
                ? "Checking Spotify"
                : !state.configured
                  ? "Spotify app keys missing"
                  : !state.connected
                    ? "No Spotify account linked"
                    : state.playing
                      ? state.title
                      : "Spotify connected"}
            </div>
            <div className="mt-1 truncate text-sm text-white/42">
              {loading
                ? "Reading your connection status"
                : !state.configured
                  ? "Add Spotify client credentials before players can connect."
                  : !state.connected
                    ? "Link once; the hub refreshes your playback token automatically."
                    : state.playing
                      ? state.artist
                      : "No track is playing right now."}
            </div>
          </div>
          {state.url ? (
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] border border-white/10 text-white/46 transition hover:border-[#1ed760]/40 hover:text-[#1ed760]"
              aria-label="Open in Spotify"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-white/36">
            Only your current playback state is shared inside the team hub.
          </p>
          {state.configured ? (
            <Button asChild variant={state.connected ? "outline" : "accent"} className="h-11 rounded-[0.9rem] px-5">
              <a href="/api/spotify/login">
                {state.connected ? <RefreshCw className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                {state.connected ? "Reconnect Spotify" : "Connect Spotify"}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function spotifyStatusMessage(status: string) {
  switch (status) {
    case "connected":
      return "Spotify connected.";
    case "state_failed":
      return "Spotify login expired. Try connecting again.";
    case "not_configured":
      return "Spotify credentials are missing.";
    case "token_failed":
      return "Spotify rejected the login callback.";
    case "refresh_missing":
      return "Spotify did not return a refresh token. Try reconnecting.";
    case "save_failed":
      return "Spotify connected, but the hub could not save the token.";
    default:
      return "Spotify connection needs attention.";
  }
}
