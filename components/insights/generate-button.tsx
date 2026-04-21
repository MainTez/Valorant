"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  name: string;
  tag: string;
  region: string;
  hasPrediction: boolean;
}

export function GenerateButton({ name, tag, region, hasPrediction }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(force: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, region, force }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to generate");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || pending;

  return (
    <div className="flex items-center gap-2">
      {!hasPrediction ? (
        <Button onClick={() => run(false)} disabled={busy}>
          <Sparkles className="h-4 w-4" />
          {busy ? "Analyzing…" : "Generate insights"}
        </Button>
      ) : (
        <Button variant="outline" onClick={() => run(true)} disabled={busy}>
          <RefreshCw className="h-4 w-4" />
          {busy ? "Refreshing…" : "Regenerate"}
        </Button>
      )}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
