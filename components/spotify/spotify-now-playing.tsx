"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Music2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpotifyState {
  configured: boolean;
  connected: boolean;
  playing: boolean;
  title: string | null;
  artist: string | null;
  albumArt: string | null;
  url: string | null;
}

const EMPTY_STATE: SpotifyState = {
  configured: true,
  connected: false,
  playing: false,
  title: null,
  artist: null,
  albumArt: null,
  url: null,
};

export function SpotifyNowPlaying() {
  const [state, setState] = useState<SpotifyState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/spotify/current", { cache: "no-store" });
        if (!res.ok) throw new Error("spotify_current_failed");
        const data = (await res.json()) as SpotifyState;
        if (alive) setState({ ...EMPTY_STATE, ...data });
      } catch {
        if (alive) setState(EMPTY_STATE);
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

  if (loading) {
    return (
      <div className="spotify-panel animate-pulse">
        <div className="h-8 w-8 rounded-lg bg-white/8" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2 w-14 rounded-full bg-white/10" />
          <div className="h-2 w-24 rounded-full bg-white/8" />
        </div>
      </div>
    );
  }

  if (!state.configured) {
    return (
      <div className="spotify-panel">
        <div className="spotify-icon spotify-icon--muted">
          <Unplug className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-white/42">
            Spotify
          </div>
          <div className="truncate text-xs font-semibold text-white/72">
            Setup needed
          </div>
        </div>
      </div>
    );
  }

  if (!state.connected) {
    return (
      <a href="/api/spotify/login" className="spotify-panel group">
        <div className="spotify-icon">
          <Music2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.6rem] uppercase tracking-[0.2em] text-white/42">
            Spotify
          </div>
          <div className="truncate text-xs font-semibold text-white/82 group-hover:text-white">
            Connect player
          </div>
        </div>
      </a>
    );
  }

  const content = (
    <>
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/6">
        {state.albumArt ? (
          <Image
            src={state.albumArt}
            alt=""
            fill
            sizes="36px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#1ed760]">
            <Music2 className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em] text-white/42">
          <span>Playing:</span>
          <Equalizer active={state.playing} />
        </div>
        <div className="truncate text-xs font-semibold text-white/88">
          {state.playing ? state.title : "Spotify paused"}
        </div>
        {state.artist ? (
          <div className="truncate text-[0.68rem] text-white/45">{state.artist}</div>
        ) : null}
      </div>
      {state.url ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/35" /> : null}
    </>
  );

  if (state.url) {
    return (
      <a href={state.url} target="_blank" rel="noreferrer" className="spotify-panel group">
        {content}
      </a>
    );
  }

  return <div className="spotify-panel">{content}</div>;
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <span className={cn("spotify-eq", !active && "spotify-eq--idle")} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
