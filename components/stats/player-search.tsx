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
      className="relative overflow-hidden rounded-[1.45rem] border border-[#c89b3c]/18 bg-[linear-gradient(180deg,rgba(21,18,14,0.98)_0%,rgba(11,13,19,0.98)_100%)] p-4 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.95)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_top,rgba(200,155,60,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.025),transparent_45%,rgba(255,255,255,0.012))]" />
      <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,0.78fr)_minmax(0,0.72fr)_minmax(172px,0.82fr)] xl:items-end">
        <div className="min-w-0">
          <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
            Riot Name
          </label>
          <div className="metal-input flex h-14 items-center gap-3 rounded-[1rem] px-4">
            <Search className="h-4 w-4 text-white/34" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TenZ"
              className="h-auto min-w-0 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-white/26 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
            Tagline
          </label>
          <div className="metal-input flex h-14 items-center rounded-[1rem] px-4">
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="0000"
              className="h-auto min-w-0 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-white/26 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
            Region
          </label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="metal-input h-14 rounded-[1rem] border-white/10 bg-transparent text-base">
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
          className="h-14 w-full min-w-0 rounded-[1rem] border border-[#c89b3c] bg-[linear-gradient(180deg,#e0b44d_0%,#b98723_100%)] px-5 text-black shadow-[0_0_24px_-12px_rgba(200,155,60,0.5)] hover:brightness-105 xl:self-end"
        >
          <Search className="h-4 w-4" />
          {loading ? "Loading..." : "Track player"}
        </Button>
      </div>
    </form>
  );
}
