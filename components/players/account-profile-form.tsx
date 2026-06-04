"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Image as ImageIcon, Upload, UserRound, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [selectedAvatarPreview, setSelectedAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewName = displayName.trim() || email.split("@")[0];
  const avatarPreviewUrl = selectedAvatarPreview ?? (removeAvatar ? "" : avatarUrl.trim());

  useEffect(() => {
    setDisplayName(initialDisplayName);
    setAvatarUrl(initialAvatarUrl ?? "");
    setSelectedAvatarFile(null);
    setRemoveAvatar(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [initialAvatarUrl, initialDisplayName]);

  useEffect(() => {
    if (!selectedAvatarFile) {
      setSelectedAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(selectedAvatarFile);
    setSelectedAvatarPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedAvatarFile]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) return;

    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const form = new FormData();
      form.set("display_name", nextDisplayName);
      if (selectedAvatarFile) {
        form.set("avatar_file", selectedAvatarFile);
      }
      if (removeAvatar) {
        form.set("remove_avatar", "1");
      }

      const response = await fetch("/api/profile/account", {
        method: "PATCH",
        body: form,
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
      setSelectedAvatarFile(null);
      setRemoveAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setLoading(false);
    }
  }

  function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    setSelectedAvatarFile(file);
    setRemoveAvatar(false);
    setSaved(false);
    setError(null);
  }

  function clearAvatar() {
    const hadSelectedFile = Boolean(selectedAvatarFile);
    setSelectedAvatarFile(null);
    setRemoveAvatar(hadSelectedFile ? false : Boolean(avatarUrl.trim()));
    setSaved(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
            {avatarPreviewUrl ? <AvatarImage src={avatarPreviewUrl} alt={previewName} /> : null}
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
              Profile picture
            </label>
            <div className="metal-input flex min-h-14 flex-wrap items-center gap-3 rounded-[1rem] px-4 py-3">
              <ImageIcon className="h-4 w-4 text-white/34" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={onAvatarSelected}
                className="hidden"
              />
              <div className="min-w-[10rem] flex-1">
                <div className="truncate text-sm text-white/76">
                  {selectedAvatarFile?.name ??
                    (avatarPreviewUrl ? "Profile picture selected" : "No picture selected")}
                </div>
                <div className="mt-0.5 text-xs text-white/34">
                  PNG, JPG, WebP, or GIF up to 3 MB.
                </div>
              </div>
              <Button
                type="button"
                variant="subtle"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-[0.75rem]"
              >
                <Upload className="h-3.5 w-3.5" />
                Choose
              </Button>
              {selectedAvatarFile || avatarPreviewUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAvatar}
                  className="rounded-[0.75rem] text-white/62 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
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
            Leaving it empty uses initials instead.
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
