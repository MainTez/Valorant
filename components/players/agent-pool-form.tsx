"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  normalizeAgentPool,
  type ValorantAgentPool,
} from "@/lib/valorant/agent-pool";
import {
  VALORANT_AGENT_NAMES,
  getAgentIcon,
  getAgentsForRole,
  type ValorantAgentName,
} from "@/lib/valorant/assets";
import { VALORANT_ROLES, type ValorantRole } from "@/lib/valorant/roles";
import { cn } from "@/lib/utils";

interface Props {
  initialAgentPool: ValorantAgentPool;
}

export function AgentPoolForm({ initialAgentPool }: Props) {
  const [agentPool, setAgentPool] = useState<ValorantAgentPool>(() =>
    normalizeAgentPool(initialAgentPool),
  );
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCount = VALORANT_ROLES.reduce((sum, role) => sum + agentPool[role].length, 0);

  function toggleAgent(role: ValorantRole, agent: ValorantAgentName) {
    setSaved(false);
    setAgentPool((current) => {
      const next = normalizeAgentPool(current);
      next[role] = next[role].includes(agent)
        ? next[role].filter((item) => item !== agent)
        : [...next[role], agent];
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    try {
      const response = await fetch("/api/profile/agent-pool", {
        body: JSON.stringify({ agent_pool: agentPool }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { agent_pool: ValorantAgentPool };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not save agent pool");
      }

      setAgentPool(normalizeAgentPool(payload.data.agent_pool));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save agent pool");
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
              <Sparkles className="h-5 w-5 text-[color:var(--accent)]" />
            </div>
            <div>
              <div className="eyebrow">Agent pool</div>
              <p className="mt-1 max-w-[48rem] text-sm leading-6 text-white/48">
                Pick the agents you can actually play for each role. Match prep uses
                these picks when the tournament five is locked.
              </p>
            </div>
          </div>
          <Badge variant={selectedCount > 0 ? "success" : "warning"}>
            {selectedCount} selected
          </Badge>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {VALORANT_ROLES.map((role) => (
            <AgentRolePicker
              key={role}
              role={role}
              selectedAgents={agentPool[role]}
              onToggle={toggleAgent}
            />
          ))}
        </div>

        {error ? (
          <div className="rounded-[0.9rem] border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {saved ? (
          <div className="flex items-center gap-2 rounded-[0.9rem] border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="h-4 w-4" />
            Agent pool saved
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-white/36">
            Empty roles are fine, but match prep can only suggest agents you save here.
          </p>
          <Button
            type="submit"
            disabled={loading}
            className="h-11 rounded-[0.9rem] px-5 active:scale-[0.98]"
          >
            {loading ? "Saving..." : "Save agent pool"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function AgentRolePicker({
  onToggle,
  role,
  selectedAgents,
}: {
  onToggle: (role: ValorantRole, agent: ValorantAgentName) => void;
  role: ValorantRole;
  selectedAgents: ValorantAgentName[];
}) {
  const agents = getAgentsForRole(role);

  return (
    <section className="rounded-[1rem] border border-white/7 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{role}</div>
          <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
            {selectedAgents.length} of {agents.length} agents selected.
          </p>
        </div>
        <Badge variant={selectedAgents.length > 0 ? "success" : "outline"}>
          {selectedAgents.length > 0 ? "Ready" : "Empty"}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {agents.map((agent) => {
          const selected = selectedAgents.includes(agent);
          return (
            <button
              key={agent}
              type="button"
              onClick={() => onToggle(role, agent)}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition active:scale-[0.98]",
                selected
                  ? "border-[color:var(--accent-soft)] bg-[color:var(--accent-dim)] text-[color:var(--accent)]"
                  : "border-white/8 bg-black/10 text-[color:var(--color-text)] hover:border-white/16 hover:bg-white/[0.04]",
              )}
            >
              <AgentIcon agent={agent} />
              <span className="min-w-0 truncate font-display text-sm tracking-wide">
                {agent}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AgentIcon({ agent }: { agent: ValorantAgentName }) {
  const icon = getAgentIcon(agent);
  if (!icon || !VALORANT_AGENT_NAMES.includes(agent)) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/8 bg-white/[0.04] text-[10px]">
        {agent.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={icon}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 shrink-0 rounded-md border border-white/8 bg-white/[0.04] object-contain"
    />
  );
}
