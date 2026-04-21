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
      className="surface p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-end"
    >
      <div className="flex-1">
        <label className="eyebrow block mb-1">Riot Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. TenZ"
        />
      </div>
      <div className="w-full md:w-32">
        <label className="eyebrow block mb-1">Tagline</label>
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="0000"
        />
      </div>
      <div className="w-full md:w-32">
        <label className="eyebrow block mb-1">Region</label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger>
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
      <Button type="submit" disabled={!name.trim() || !tag.trim() || loading}>
        <Search className="h-4 w-4" />
        {loading ? "Loading…" : "Track"}
      </Button>
    </form>
  );
}
