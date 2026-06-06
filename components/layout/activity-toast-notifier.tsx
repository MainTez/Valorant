"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  Film,
  Swords,
  Tag,
  X,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildActivityNotification,
  type ActivityNotification,
  type ActivityNotificationActor,
  type ActivityNotificationKind,
} from "@/lib/activity-notifications";
import { cn } from "@/lib/utils";
import type { ActivityEventRow, UserRow } from "@/types/domain";

type ToastActor = Pick<UserRow, "id" | "display_name" | "email">;

interface Props {
  members: ToastActor[];
  teamId: string;
}

const ICONS: Record<ActivityNotificationKind, LucideIcon> = {
  clip: Tag,
  match: Swords,
  task: ClipboardCheck,
  vod: Film,
};

const TONE_CLASS: Record<ActivityNotification["tone"], string> = {
  danger: "border-red-400/35",
  info: "border-sky-300/25",
  success: "border-emerald-300/30",
  warning: "border-amber-300/30",
};

export function ActivityToastNotifier({ members, teamId }: Props) {
  const [toasts, setToasts] = useState<ActivityNotification[]>([]);
  const seenRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  useEffect(() => {
    const membersById = new Map<string, ActivityNotificationActor>(
      members.map((member) => [
        member.id,
        { display_name: member.display_name, email: member.email },
      ]),
    );
    const timers = timersRef.current;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`activity-toasts:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_events",
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const row = payload.new as ActivityEventRow;
          const eventKey = row.id || `${row.actor_id}:${row.verb}:${row.created_at}`;
          if (seenRef.current.has(eventKey)) return;
          seenRef.current.add(eventKey);

          const notification = buildActivityNotification(
            {
              actor_id: row.actor_id,
              created_at: row.created_at,
              id: eventKey,
              object_id: row.object_id,
              object_type: row.object_type,
              payload: row.payload,
              verb: row.verb,
            },
            row.actor_id ? membersById.get(row.actor_id) : null,
          );
          if (!notification) return;

          setToasts((current) => [
            notification,
            ...current.filter((toast) => toast.id !== notification.id),
          ].slice(0, 3));

          const existingTimer = timers.get(notification.id);
          if (existingTimer) window.clearTimeout(existingTimer);
          const timer = window.setTimeout(() => dismissToast(notification.id), 7_000);
          timers.set(notification.id, timer);
        },
      )
      .subscribe();

    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
      void supabase.removeChannel(channel);
    };
  }, [dismissToast, members, teamId]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-5 top-[10.25rem] z-50 grid w-[min(23rem,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => (
        <ActivityToast key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </div>
  );
}

function ActivityToast({
  onDismiss,
  toast,
}: {
  onDismiss: () => void;
  toast: ActivityNotification;
}) {
  const Icon = ICONS[toast.kind];

  return (
    <div
      className={cn(
        "rounded-xl border bg-[#090d14]/96 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl animate-slide-up",
        TONE_CLASS[toast.tone],
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/8 bg-white/[0.04]">
          <Icon className="h-4 w-4 text-[color:var(--accent)]" />
        </div>
        <Link href={toast.href} className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            {toast.title}
          </div>
          <div className="mt-1 text-sm leading-5 text-white/82">{toast.body}</div>
        </Link>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/8 text-white/52 transition hover:border-white/18 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
