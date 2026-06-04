"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  VALORANT_ROLES,
  normalizeSecondaryValorantRoles,
  type ValorantRole,
} from "@/lib/valorant/roles";
import { cn } from "@/lib/utils";

interface Props {
  initialPreferredRole: ValorantRole | null;
  initialSecondaryRoles: ValorantRole[];
  setupMode?: boolean;
}

export function ValorantRoleForm({
  initialPreferredRole,
  initialSecondaryRoles,
  setupMode = false,
}: Props) {
  const router = useRouter();
  const [preferredRole, setPreferredRole] = useState<ValorantRole | null>(initialPreferredRole);
  const [secondaryRoles, setSecondaryRoles] = useState<ValorantRole[]>(
    normalizeSecondaryValorantRoles(initialPreferredRole, initialSecondaryRoles),
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanSecondaryRoles = normalizeSecondaryValorantRoles(preferredRole, secondaryRoles);

  function choosePreferredRole(role: ValorantRole) {
    setPreferredRole(role);
    setSecondaryRoles((current) => current.filter((item) => item !== role));
    setSaved(false);
  }

  function toggleSecondaryRole(role: ValorantRole) {
    if (!preferredRole || role === preferredRole) return;
    setSecondaryRoles((current) => {
      if (current.includes(role)) return current.filter((item) => item !== role);
      return [...current, role];
    });
    setSaved(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preferredRole) return;

    setLoading(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/profile/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_role: preferredRole,
          secondary_roles: cleanSecondaryRoles,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: {
          preferred_role: ValorantRole;
          secondary_roles: ValorantRole[];
        };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not save role preferences");
      }

      setPreferredRole(payload.data.preferred_role);
      setSecondaryRoles(payload.data.secondary_roles);
      setSaved(true);
      if (setupMode) {
        router.replace("/dashboard");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role preferences");
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[1rem] border border-white/10 bg-white/[0.035]">
              <ShieldCheck className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <div className="eyebrow">Valorant roles</div>
              <p className="mt-1 max-w-[48rem] text-sm leading-6 text-white/48">
                Choose your preferred role and any secondary roles you can play.
                Tournament waitlist promotion uses this when a locked slot opens.
              </p>
            </div>
          </div>
          {setupMode ? <Badge variant="warning">Required setup</Badge> : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <RolePicker
            title="Preferred role"
            description="This is your main role for roster balance."
            selectedRoles={preferredRole ? [preferredRole] : []}
            disabledRoles={[]}
            onSelect={choosePreferredRole}
          />
          <RolePicker
            title="Secondary roles"
            description="Pick backup roles. Leave empty if you only want your main role."
            selectedRoles={cleanSecondaryRoles}
            disabledRoles={preferredRole ? [preferredRole] : [...VALORANT_ROLES]}
            onSelect={toggleSecondaryRole}
            multiple
          />
        </div>

        {error ? (
          <div className="rounded-[0.9rem] border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="flex items-center gap-2 rounded-[0.9rem] border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            Role preferences saved
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-white/36">
            Your preferred role counts first. Secondary roles only matter when the waitlist needs a better fit.
          </p>
          <Button
            type="submit"
            disabled={!preferredRole || loading}
            className="h-11 rounded-[0.9rem] px-5 active:scale-[0.98]"
          >
            {loading ? "Saving..." : setupMode ? "Save and continue" : "Save roles"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function RolePicker({
  description,
  disabledRoles,
  multiple = false,
  onSelect,
  selectedRoles,
  title,
}: {
  description: string;
  disabledRoles: ValorantRole[];
  multiple?: boolean;
  onSelect: (role: ValorantRole) => void;
  selectedRoles: ValorantRole[];
  title: string;
}) {
  return (
    <div className="rounded-[1rem] border border-white/7 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
            {description}
          </p>
        </div>
        {multiple ? <Badge variant="outline">Optional</Badge> : <Badge>Primary</Badge>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {VALORANT_ROLES.map((role) => {
          const selected = selectedRoles.includes(role);
          const disabled = disabledRoles.includes(role);
          return (
            <button
              key={role}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(role)}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                  : "border-white/8 bg-black/10 text-[color:var(--color-text)] hover:border-white/16 hover:bg-white/[0.04]",
              )}
            >
              <span className="font-display text-sm tracking-wide">{role}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
