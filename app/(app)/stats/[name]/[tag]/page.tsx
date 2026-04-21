import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { henrikAccount, henrikMMR, henrikMatches, henrikMmrHistory } from "@/lib/henrik/client";
import {
  normalizeAccount,
  normalizeMMR,
  normalizeMatches,
  normalizeMmrHistory,
} from "@/lib/henrik/normalize";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";
import { PlayerProfileCard } from "@/components/stats/player-profile-card";
import { MatchHistoryTable } from "@/components/stats/match-history-table";
import { FormChart } from "@/components/stats/form-chart";
import { AgentUsage } from "@/components/stats/agent-usage";
import { MapPerformance } from "@/components/stats/map-performance";
import { EmptyState } from "@/components/common/empty-state";
import type { NormalizedMatch } from "@/types/domain";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ name: string; tag: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props) {
  const { name, tag } = await params;
  return { title: `${decodeURIComponent(name)}#${decodeURIComponent(tag)}` };
}

export default async function PlayerStatsPage({ params, searchParams }: Props) {
  const { name, tag } = await params;
  const sp = await searchParams;
  const region = normalizeRegion(typeof sp.region === "string" ? sp.region : defaultRegion());
  const { team } = await requireSession();

  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);

  let accountRes, mmrRes, matchesRes, historyRes;
  try {
    [accountRes, mmrRes, matchesRes, historyRes] = await Promise.all([
      henrikAccount(decodedName, decodedTag),
      henrikMMR(decodedName, decodedTag, region),
      henrikMatches(decodedName, decodedTag, region, { size: 10 }),
      henrikMmrHistory(decodedName, decodedTag, region),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Henrik API error";
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="surface p-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-400" />
          <h2 className="font-display text-2xl tracking-wide mt-3">Could not load player</h2>
          <p className="text-[color:var(--color-muted)] mt-2">{message}</p>
          <Link href="/stats" className="btn-ghost mt-6 inline-flex">Back to search</Link>
        </div>
      </div>
    );
  }

  const account = normalizeAccount(accountRes);
  const mmr = normalizeMMR(mmrRes);
  const matches = normalizeMatches(matchesRes, {
    puuid: account?.puuid,
    name: decodedName,
    tag: decodedTag,
  });
  const history = normalizeMmrHistory(historyRes);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <EmptyState
          title="Player not found"
          description={`No Riot account for ${decodedName}#${decodedTag} in ${region.toUpperCase()}.`}
          action={<Link href="/stats" className="btn-ghost">Back to search</Link>}
        />
      </div>
    );
  }

  // Persist/update profile under the team scope so future dashboards show it.
  try {
    const admin = createSupabaseAdminClient();
    const { kdStat, acsStat, hsStat, wrStat } = aggregate(matches);
    await admin
      .from("player_profiles")
      .upsert(
        {
          riot_name: account.name,
          riot_tag: account.tag,
          region,
          puuid: account.puuid,
          team_id: team.id,
          current_rank: mmr?.currentTier ?? null,
          current_rr: mmr?.currentRR ?? null,
          peak_rank: mmr?.peakTier ?? null,
          headshot_pct: hsStat,
          kd_ratio: kdStat,
          acs: acsStat,
          win_rate: wrStat,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "riot_name,riot_tag" },
      );
  } catch {
    // non-fatal
  }

  const onTeam = false; // presence of a user link is resolved in Players page

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Stats Tracker</div>
          <Link href="/stats" className="text-sm text-[color:var(--color-muted)] hover:accent-text">
            ← Back to search
          </Link>
        </div>
        <Link
          href={`/insights/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
          className="btn-accent"
        >
          <Sparkles className="h-4 w-4" /> AI Insights
        </Link>
      </div>

      <PlayerProfileCard
        account={account}
        mmr={mmr}
        matches={matches}
        region={region}
        onTeam={onTeam}
      />

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
        <FormChart matches={matches} />
        <AgentUsage matches={matches} />
      </section>

      <section>
        <MapPerformance matches={matches} />
      </section>

      <section>
        <MatchHistoryTable matches={matches} />
      </section>

      {history.length > 0 ? (
        <section className="surface p-5">
          <div className="eyebrow">Recent RR change</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {history.slice(0, 15).map((h, i) => (
              <div
                key={`${h.date}-${i}`}
                className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs"
              >
                <span className={h.rrChange > 0 ? "text-green-400" : h.rrChange < 0 ? "text-red-400" : "text-[color:var(--color-muted)]"}>
                  {h.rrChange > 0 ? "+" : ""}{h.rrChange}
                </span>
                <span className="text-[color:var(--color-muted)]">
                  {h.currentTier ?? "—"} · {h.map ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function aggregate(matches: NormalizedMatch[]) {
  if (matches.length === 0) {
    return { kdStat: null, acsStat: null, hsStat: null, wrStat: null };
  }
  const kds = matches.map((m) => (m.deaths === 0 ? m.kills : m.kills / Math.max(1, m.deaths)));
  const acss = matches.map((m) => m.acs);
  const hss = matches.map((m) => m.headshotPct);
  const decided = matches.filter((m) => m.result === "win" || m.result === "loss");
  const wins = matches.filter((m) => m.result === "win").length;
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    kdStat: Number(avg(kds).toFixed(3)),
    acsStat: Number(avg(acss).toFixed(2)),
    hsStat: Number(avg(hss).toFixed(2)),
    wrStat: decided.length ? Number(((wins / decided.length) * 100).toFixed(2)) : null,
  };
}
