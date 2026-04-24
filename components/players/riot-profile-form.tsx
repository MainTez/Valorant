"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HENRIK_REGIONS } from "@/lib/henrik/regions";

interface Props {
  initialName: string;
  initialTag: string;
  initialRegion: string;
}

export function RiotProfileForm({ initialName, initialTag, initialRegion }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [tag, setTag] = useState(initialTag);
  const [region, setRegion] = useState(initialRegion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const riotName = name.trim();
    const riotTag = tag.trim().replace(/^#/, "");
    if (!riotName || !riotTag) return;

    setLoading(true);
    setError(null);
    setSaved(null);

    try {
      const response = await fetch("/api/profile/riot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: riotName, tag: riotTag, region }),
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: { riot_name: string; riot_tag: string; riot_region: string };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save Riot ID");
      }

      const next = payload.data;
      if (next) {
        setName(next.riot_name);
        setTag(next.riot_tag);
        setRegion(next.riot_region);
        setSaved(`${next.riot_name}#${next.riot_tag}`);
      } else {
        setSaved(`${riotName}#${riotTag}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Riot ID");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.96)_0%,rgba(10,12,17,0.99)_100%)] p-5 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.035),transparent_42%,rgba(246,196,83,0.05)_100%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] border border-white/10 bg-white/[0.035]">
            <UserRound className="h-5 w-5 text-[color:var(--accent)]" />
          </div>
          <div>
            <div className="eyebrow">Profile Riot ID</div>
            <p className="mt-1 max-w-[46rem] text-sm leading-6 text-white/48">
              Link your own Riot account so the roster card, team snapshot, and
              AI insight shortcuts point at the right player.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.75fr)_minmax(0,0.7fr)]">
          <div>
            <label className="mb-2 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
              Riot Name
            </label>
            <div className="metal-input flex h-14 items-center gap-3 rounded-[1rem] px-4">
              <Search className="h-4 w-4 text-white/34" />
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. TenZ"
                className="h-auto min-w-0 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-white/26 focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
              Tagline
            </label>
            <div className="metal-input flex h-14 items-center rounded-[1rem] px-4">
              <Input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                placeholder="0000"
                className="h-auto min-w-0 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-white/26 focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
              Region
            </label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="metal-input h-14 rounded-[1rem] border-white/10 bg-transparent text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HENRIK_REGIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <div className="rounded-[0.9rem] border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="flex items-center gap-2 rounded-[0.9rem] border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            Saved {saved}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-white/36">
            The account is checked against Henrik before it is attached to your team profile.
          </p>
          <Button
            type="submit"
            disabled={!name.trim() || !tag.trim() || loading}
            className="h-11 rounded-[0.9rem] px-5 active:scale-[0.98]"
          >
            {loading ? "Checking..." : "Save Riot ID"}
          </Button>
        </div>
      </div>
    </form>
  );
}
