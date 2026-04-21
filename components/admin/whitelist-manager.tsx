"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { relativeTime } from "@/lib/utils";
import type { TeamRow, WhitelistRow } from "@/types/domain";

interface Props {
  teams: TeamRow[];
  entries: WhitelistRow[];
  currentAdminTeamId: string;
}

export function WhitelistManager({ teams, entries, currentAdminTeamId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function add(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        team_id: String(formData.get("team_id") ?? currentAdminTeamId),
        role: String(formData.get("role") ?? "player") as "player" | "coach" | "admin",
      };
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Add failed");
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/whitelist?id=${id}`, { method: "DELETE" });
    if (res.ok) startTransition(() => router.refresh());
  }

  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(new FormData(e.currentTarget));
        }}
        className="surface p-5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end"
      >
        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input name="email" type="email" required placeholder="player@example.com" />
        </div>
        <div className="grid gap-1.5">
          <Label>Team</Label>
          <Select name="team_id" defaultValue={currentAdminTeamId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Role</Label>
          <Select name="role" defaultValue="player">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="player">Player</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={submitting}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-widest text-[color:var(--color-muted)]">
              <tr>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Added</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[color:var(--color-muted)]">
                    No members on the whitelist yet.
                  </td>
                </tr>
              ) : (
                entries.map((w) => (
                  <tr key={w.id} className="border-t border-white/5 hover:bg-white/[0.025]">
                    <td className="px-4 py-3">{w.email}</td>
                    <td className="px-4 py-3">{teamsById[w.team_id]?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{w.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--color-muted)]">
                      {relativeTime(w.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(w.id)}
                        disabled={pending}
                        aria-label="Remove"
                        className="inline-flex items-center gap-1 text-xs text-[color:var(--color-muted)] hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
