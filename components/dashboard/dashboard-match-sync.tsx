"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { DesktopMoment } from "@/components/desktop/types";

interface SyncResponse {
  data?: {
    created?: number;
    moments?: DesktopMoment[];
    reason?: string;
  };
  error?: string;
}

interface MomentsResponse {
  data?: DesktopMoment[];
  error?: string;
}

export function DashboardMatchSync() {
  const router = useRouter();
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function syncRecentGames() {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const res = await fetch("/api/desktop/sync", { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as SyncResponse;
        if (!res.ok || cancelled) return;

        if ((body.data?.created ?? 0) > 0) {
          const moments = await loadLatestMoments();
          if (!cancelled && moments.length > 0) {
            window.dispatchEvent(
              new CustomEvent("match-moment:created", {
                detail: moments.slice(0, body.data?.created ?? 1),
              }),
            );
          }

          if (!cancelled) router.refresh();
        }
      } finally {
        syncingRef.current = false;
      }
    }

    void syncRecentGames();
    const timer = window.setInterval(() => {
      void syncRecentGames();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}

async function loadLatestMoments(): Promise<DesktopMoment[]> {
  const res = await fetch("/api/desktop/moments?limit=12");
  const body = (await res.json().catch(() => ({}))) as MomentsResponse;
  if (!res.ok) return [];
  return body.data ?? [];
}
