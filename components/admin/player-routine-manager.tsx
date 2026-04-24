"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Save, WandSparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPersonalRoutineTemplateForUser } from "@/lib/routines/player-routines";
import { initials } from "@/lib/utils";
import type { Role, RoutineItem, RoutineRow } from "@/types/domain";

interface PlayerRoutineUser {
  id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  role: Role;
  team_id: string;
}

interface Props {
  players: PlayerRoutineUser[];
  routines: RoutineRow[];
}

interface Draft {
  title: string;
  text: string;
}

function playerName(player: PlayerRoutineUser) {
  return player.display_name ?? player.email.split("@")[0] ?? player.email;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || "routine_item";
}

function itemsToText(items: RoutineItem[]) {
  return items
    .map((item) =>
      [item.label, item.detail, item.duration, item.tag]
        .map((part) => part?.trim() ?? "")
        .join(" | ")
        .replace(/(?:\s\|\s)+$/g, ""),
    )
    .join("\n");
}

function parseRoutineText(text: string): RoutineItem[] {
  const items: RoutineItem[] = [];
  text
    .split("\n")
    .forEach((line, index) => {
      const [labelRaw, detailRaw, durationRaw, tagRaw] = line
        .split("|")
        .map((part) => part.trim());
      if (!labelRaw) return;
      items.push({
        id: `${slugify(labelRaw)}_${index + 1}`,
        label: labelRaw,
        detail: detailRaw || undefined,
        duration: durationRaw || undefined,
        tag: tagRaw || undefined,
      });
    });
  return items;
}

function buildDraft(player: PlayerRoutineUser, routine: RoutineRow | null): Draft {
  if (routine) {
    return {
      title: routine.title,
      text: itemsToText(routine.items ?? []),
    };
  }

  const template = getPersonalRoutineTemplateForUser(player);
  if (template) {
    return {
      title: template.title,
      text: itemsToText(template.items),
    };
  }

  return {
    title: `${playerName(player)} daily routine`,
    text: [
      "Aim warmup | Range and deathmatch with one clean focus | 20 min | mechanics",
      "Competitive block | Queue with one measurable improvement target | 2 games | ranked",
      "Review note | Write one mistake and one fix from today | 10 min | review",
    ].join("\n"),
  };
}

export function PlayerRoutineManager({ players, routines }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const routinesByUser = new Map(
    routines
      .filter((routine) => routine.assigned_user_id)
      .map((routine) => [routine.assigned_user_id as string, routine]),
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      players.map((player) => [
        player.id,
        buildDraft(player, routinesByUser.get(player.id) ?? null),
      ]),
    ),
  );

  function updateDraft(playerId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [playerId]: { ...current[playerId], ...patch },
    }));
  }

  function loadTemplate(player: PlayerRoutineUser) {
    const template = getPersonalRoutineTemplateForUser(player);
    if (!template) return;
    updateDraft(player.id, {
      title: template.title,
      text: itemsToText(template.items),
    });
  }

  async function save(player: PlayerRoutineUser) {
    setError(null);
    setSavingId(player.id);
    const draft = drafts[player.id];
    const items = parseRoutineText(draft.text);
    if (items.length === 0) {
      setError("Routine needs at least one item.");
      setSavingId(null);
      return;
    }

    try {
      const res = await fetch("/api/admin/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: player.id,
          title: draft.title.trim(),
          items,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function reset(player: PlayerRoutineUser) {
    setError(null);
    setSavingId(player.id);
    try {
      const res = await fetch(`/api/admin/routines?user_id=${player.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Reset failed");
      }
      updateDraft(player.id, buildDraft(player, null));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setSavingId(null);
    }
  }

  if (players.length === 0) {
    return (
      <div className="surface p-8 text-center text-[color:var(--color-muted)]">
        No players found for this team yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface p-4 text-sm text-[color:var(--color-muted)]">
        Format each item as{" "}
        <span className="text-[color:var(--color-text)]">
          Label | Detail | Duration | Tag
        </span>
        . Only the label is required.
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {players.map((player) => {
          const routine = routinesByUser.get(player.id) ?? null;
          const template = getPersonalRoutineTemplateForUser(player);
          const draft = drafts[player.id] ?? buildDraft(player, routine);
          const busy = pending || savingId === player.id;
          return (
            <section key={player.id} className="surface flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  {player.avatar_url ? (
                    <AvatarImage src={player.avatar_url} alt={playerName(player)} />
                  ) : null}
                  <AvatarFallback>{initials(playerName(player))}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-xl tracking-wide">
                    {playerName(player)}
                  </div>
                  <div className="truncate text-xs text-[color:var(--color-muted)]">
                    {player.email}
                  </div>
                </div>
                <Badge variant={routine ? "default" : "outline"}>
                  {routine ? "Custom" : template ? "Template" : player.role}
                </Badge>
              </div>

              <div className="grid gap-1.5">
                <Label>Routine title</Label>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    updateDraft(player.id, { title: event.currentTarget.value })
                  }
                  placeholder={`${playerName(player)} daily routine`}
                />
              </div>

              <div className="grid gap-1.5">
                <Label>Routine items</Label>
                <Textarea
                  value={draft.text}
                  onChange={(event) =>
                    updateDraft(player.id, { text: event.currentTarget.value })
                  }
                  className="min-h-[210px] font-mono text-xs leading-5"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save(player)} disabled={busy}>
                  {routine ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {routine ? "Update routine" : "Save routine"}
                </Button>
                {template ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadTemplate(player)}
                    disabled={busy}
                  >
                    <WandSparkles className="h-4 w-4" />
                    Load template
                  </Button>
                ) : null}
                {routine ? (
                  <Button
                    type="button"
                    variant="subtle"
                    onClick={() => reset(player)}
                    disabled={busy}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset custom
                  </Button>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
