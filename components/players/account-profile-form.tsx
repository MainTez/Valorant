"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Image as ImageIcon, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";

interface Props {
  initialAvatarUrl: string | null;
  initialDisplayName: string;
  email: string;
}

export function AccountProfileForm({
  email,
  initialAvatarUrl,
  initialDisplayName,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewName = displayName.trim() || email.split("@")[0];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    const nextAvatarUrl = avatarUrl.trim();
    if (!nextDisplayName) return;

    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/profile/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: nextDisplayName,
          avatar_url: nextAvatarUrl || null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { display_name: string | null; avatar_url: string | null };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not save profile");
      }

      setDisplayName(payload.data.display_name ?? nextDisplayName);
      setAvatarUrl(payload.data.avatar_url ?? "");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.1rem] border border-white/8 bg-white/[0.025] p-5 shadow-[0_18px_48px_-42px_rgba(0,0,0,0.85)]"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] border border-white/10 bg-white/[0.035]">
              <UserRound className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <div className="eyebrow">Roster identity</div>
              <p className="mt-1 max-w-[46rem] text-sm leading-6 text-white/48">
                Change the name and picture teammates see on roster cards, chat, and tournament opt-ins.
              </p>
            </div>
          </div>
          <Avatar className="h-16 w-16">
            {avatarUrl.trim() ? <AvatarImage src={avatarUrl.trim()} alt={previewName} /> : null}
            <AvatarFallback>{initials(previewName)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <label className="mb-2 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
              Username
            </label>
            <div className="metal-input flex h-14 items-center gap-3 rounded-[1rem] px-4">
              <UserRound className="h-4 w-4 text-white/34" />
              <Input
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setSaved(false);
                }}
                placeholder="Roster name"
                className="h-auto min-w-0 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-white/26 focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] uppercase tracking-[0.22em] text-white/40">
              Profile picture URL
            </label>
            <div className="metal-input flex h-14 items-center gap-3 rounded-[1rem] px-4">
              <ImageIcon className="h-4 w-4 text-white/34" />
              <Input
                value={avatarUrl}
                onChange={(event) => {
                  setAvatarUrl(event.target.value);
                  setSaved(false);
                }}
                placeholder="https://..."
                className="h-auto min-w-0 border-0 bg-transparent px-0 text-base shadow-none placeholder:text-white/26 focus-visible:ring-0"
              />
            </div>
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
            Profile saved
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-white/36">
            Leave the picture empty to use initials instead.
          </p>
          <Button
            type="submit"
            disabled={!displayName.trim() || loading}
            className="h-11 rounded-[0.9rem] px-5 active:scale-[0.98]"
          >
            {loading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
    </form>
  );
}
