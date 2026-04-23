import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  henrikAccount,
  henrikMatches,
  henrikMMR,
  henrikMmrHistory,
} from "@/lib/henrik/client";
import {
  normalizeAccount,
  normalizeMatches,
  normalizeMMR,
  normalizeMmrHistory,
} from "@/lib/henrik/normalize";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";
import { filterCoreStatsMatches } from "@/lib/stats/match-filters";
import { EmptyState } from "@/components/common/empty-state";
import { PlayerStatsDashboard } from "@/components/stats/player-stats-dashboard";
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
      henrikMatches(decodedName, decodedTag, region, { size: 20 }),
      henrikMmrHistory(decodedName, decodedTag, region),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Henrik API error";
    return (
      <div className="mx-auto mt-8 max-w-2xl">
        <div className="surface p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <h2 className="mt-3 font-display text-2xl tracking-wide">Could not load player</h2>
          <p className="mt-2 text-[color:var(--color-muted)]">{message}</p>
          <Link href="/stats" className="btn-ghost mt-6 inline-flex">
            Back to search
          </Link>
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
  const analyticalMatches = filterCoreStatsMatches(matches);
  const history = normalizeMmrHistory(historyRes);

  if (!account) {
    return (
      <div className="mx-auto mt-8 max-w-2xl">
        <EmptyState
          title="Player not found"
          description={`No Riot account for ${decodedName}#${decodedTag} in ${region.toUpperCase()}.`}
          action={
            <Link href="/stats" className="btn-ghost">
              Back to search
            </Link>
          }
        />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: rosterUser } = await supabase
    .from("users")
    .select("id")
    .eq("team_id", team.id)
    .eq("riot_name", account.name)
    .eq("riot_tag", account.tag)
    .maybeSingle();

  try {
    const admin = createSupabaseAdminClient();
    const { kdStat, acsStat, hsStat, wrStat } = aggregate(analyticalMatches);
    await admin.from("player_profiles").upsert(
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

  return (
    <div className="flex max-w-[1400px] flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Stats Tracker</div>
          <Link href="/stats" className="text-sm text-[color:var(--color-muted)] hover:accent-text">
            Back to search
          </Link>
        </div>
        <Link
          href={`/insights/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
          className="btn-accent"
        >
          <Sparkles className="h-4 w-4" /> AI Insights
        </Link>
      </div>

      <PlayerStatsDashboard
        account={account}
        mmr={mmr}
        matches={analyticalMatches}
        history={history}
        region={region}
        onTeam={Boolean(rosterUser)}
        insightsHref={`/insights/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
      />
    </div>
  );
}

function aggregate(matches: NormalizedMatch[]) {
  if (matches.length === 0) {
    return { kdStat: null, acsStat: null, hsStat: null, wrStat: null };
  }

  const kds = matches.map((match) =>
    match.deaths === 0 ? match.kills : match.kills / Math.max(1, match.deaths),
  );
  const acs = matches.map((match) => match.acs);
  const hs = matches.map((match) => match.headshotPct);
  const decided = matches.filter((match) => match.result === "win" || match.result === "loss");
  const wins = matches.filter((match) => match.result === "win").length;
  const average = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    kdStat: Number(average(kds).toFixed(3)),
    acsStat: Number(average(acs).toFixed(2)),
    hsStat: Number(average(hs).toFixed(2)),
    wrStat: decided.length ? Number(((wins / decided.length) * 100).toFixed(2)) : null,
  };
}
