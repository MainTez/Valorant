"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HENRIK_REGIONS } from "@/lib/henrik/regions";

export function PlayerSearch({ defaultRegion = "eu" }: { defaultRegion?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState(defaultRegion);
  const [loading, setLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const t = tag.trim().replace(/^#/, "");
    if (!n || !t) return;
    setLoading(true);
    router.push(`/stats/${encodeURIComponent(n)}/${encodeURIComponent(t)}?region=${region}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-[1.35rem] border border-white/7 bg-[linear-gradient(180deg,rgba(19,22,29,0.96)_0%,rgba(11,13,19,0.98)_100%)] p-4 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(246,196,83,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_45%,rgba(255,255,255,0.015))]" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
            Riot Name
          </label>
          <div className="metal-input flex h-12 items-center gap-3 rounded-[0.95rem] px-4">
            <Search className="h-4 w-4 text-white/34" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TenZ"
              className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="w-full md:w-36">
          <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
            Tagline
          </label>
          <div className="metal-input flex h-12 items-center rounded-[0.95rem] px-4">
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="0000"
              className="h-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="w-full md:w-36">
          <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
            Region
          </label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="metal-input h-12 rounded-[0.95rem] border-white/10 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HENRIK_REGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          disabled={!name.trim() || !tag.trim() || loading}
          className="h-12 min-w-36 rounded-[0.95rem] border border-[color:var(--accent)] bg-[linear-gradient(180deg,var(--accent)_0%,color-mix(in_srgb,var(--accent)_74%,#000)_100%)] text-black shadow-[0_0_24px_-12px_var(--accent)] hover:brightness-105"
        >
          <Search className="h-4 w-4" />
          {loading ? "Loading…" : "Track player"}
        </Button>
      </div>
    </form>
  );
}
