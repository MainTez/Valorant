import Link from "next/link";
import { Sparkles, TrendingUp, Users } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/common/empty-state";
import { ConfidenceMeter } from "@/components/insights/confidence-meter";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/common/rank-badge";
import type { AiPredictionRow, PlayerProfileRow } from "@/types/domain";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team Insights" };

export default async function TeamInsightsPage() {
  const { team } = await requireSession();
  const supabase = await createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("team_id", team.id);

  const list = ((profiles ?? []) as PlayerProfileRow[]);
  const ids = list.map((p) => p.id);
  const { data: predRows } = ids.length
    ? await supabase
        .from("ai_predictions")
        .select("*")
        .in("player_profile_id", ids)
        .order("generated_at", { ascending: false })
    : { data: [] as AiPredictionRow[] };

  const latestByPlayer = new Map<string, AiPredictionRow>();
  for (const r of (predRows ?? []) as AiPredictionRow[]) {
    if (!latestByPlayer.has(r.player_profile_id)) latestByPlayer.set(r.player_profile_id, r);
  }

  const avg = (key: keyof PlayerProfileRow) => {
    const vals = list
      .map((p) => (p[key] as number | null) ?? null)
      .filter((v): v is number => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const teamAverages = {
    acs: avg("acs"),
    kd: avg("kd_ratio"),
    winRate: avg("win_rate"),
    headshot: avg("headshot_pct"),
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <header>
        <div className="eyebrow">AI Insights</div>
        <h1 className="font-display text-3xl tracking-wide mt-1">
          {team.name} · team outlook
        </h1>
        <p className="text-[color:var(--color-muted)] mt-1">
          Grounded predictions built from each player&rsquo;s last 20 matches.
          All numbers are derived, not guessed.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AvgCard label="Team ACS" value={teamAverages.acs != null ? Math.round(teamAverages.acs).toString() : "—"} icon={<TrendingUp className="h-4 w-4" />} />
        <AvgCard label="Team K/D" value={teamAverages.kd != null ? teamAverages.kd.toFixed(2) : "—"} icon={<TrendingUp className="h-4 w-4" />} />
        <AvgCard label="Team Win Rate" value={teamAverages.winRate != null ? `${teamAverages.winRate.toFixed(0)}%` : "—"} icon={<TrendingUp className="h-4 w-4" />} />
        <AvgCard label="Team HS%" value={teamAverages.headshot != null ? `${teamAverages.headshot.toFixed(0)}%` : "—"} icon={<TrendingUp className="h-4 w-4" />} />
      </section>

      {list.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No tracked players yet"
          description="Track players from the Stats page — their profiles will land here and insights will appear."
          action={<Link href="/stats" className="btn-accent">Go to stats</Link>}
        />
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => {
            const pred = latestByPlayer.get(p.id) ?? null;
            return (
              <Link
                key={p.id}
                href={`/insights/${encodeURIComponent(p.riot_name)}/${encodeURIComponent(p.riot_tag)}?region=${p.region ?? "eu"}`}
                className="surface p-5 hover-lift flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-xl tracking-wide truncate">
                      {p.riot_name}
                      <span className="text-[color:var(--color-muted)]"> #{p.riot_tag}</span>
                    </div>
                    <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
                      Synced{" "}
                      {p.last_synced_at
                        ? new Date(p.last_synced_at).toLocaleDateString()
                        : "never"}
                    </div>
                  </div>
                  {pred?.llm_used ? (
                    <Badge>AI-enhanced</Badge>
                  ) : pred ? (
                    <Badge variant="outline">Rules</Badge>
                  ) : (
                    <Badge variant="outline">No prediction</Badge>
                  )}
                </div>

                <RankBadge rank={p.current_rank} rr={p.current_rr ?? undefined} />

                {pred ? (
                  <>
                    <div className="flex items-baseline gap-3">
                      <div className="text-xs uppercase tracking-widest text-[color:var(--color-muted)]">
                        Predicted
                      </div>
                      <div className="font-display text-xl tracking-wide">
                        {pred.predicted_rank ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[color:var(--color-muted)]">
                        Confidence {Math.round((pred.confidence ?? 0) * 100)}%
                      </div>
                      <ConfidenceMeter value={pred.confidence ?? 0} />
                    </div>
                    {pred.reasoning ? (
                      <p className="text-xs text-[color:var(--color-muted)] line-clamp-3">
                        {pred.reasoning}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-xs text-[color:var(--color-muted)]">
                    No prediction yet — open to generate.
                  </p>
                )}

                <div className="mt-auto text-[color:var(--accent)] text-xs">View →</div>
              </Link>
            );
          })}
        </section>
      )}

      <div className="surface p-5 flex items-center gap-3">
        <Users className="h-5 w-5 text-[color:var(--accent)]" />
        <div className="text-sm text-[color:var(--color-muted)]">
          These numbers come from HenrikDev match history and our rule engine.
          The LLM layer (OpenRouter, free tier) only phrases them — never alters
          the prediction.
        </div>
      </div>
    </div>
  );
}

function AvgCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        <span className="text-[color:var(--accent)]">{icon}</span>
      </div>
      <div className="stat-number mt-1">{value}</div>
    </div>
  );
}
