import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireSession } from "@/lib/auth/get-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PredictionCard } from "@/components/insights/prediction-card";
import { StrengthsWeaknesses } from "@/components/insights/strengths-weaknesses";
import { DataSources } from "@/components/insights/data-sources";
import { GenerateButton } from "@/components/insights/generate-button";
import { EmptyState } from "@/components/common/empty-state";
import { defaultRegion, normalizeRegion } from "@/lib/henrik/regions";
import type { AiPredictionRow, PlayerProfileRow } from "@/types/domain";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ name: string; tag: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props) {
  const { name, tag } = await params;
  return { title: `Insights · ${decodeURIComponent(name)}#${decodeURIComponent(tag)}` };
}

export default async function InsightsPage({ params, searchParams }: Props) {
  const { name, tag } = await params;
  const sp = await searchParams;
  const region = normalizeRegion(typeof sp.region === "string" ? sp.region : defaultRegion());
  const decodedName = decodeURIComponent(name);
  const decodedTag = decodeURIComponent(tag);
  await requireSession();

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("player_profiles")
    .select("*")
    .eq("riot_name", decodedName)
    .eq("riot_tag", decodedTag)
    .maybeSingle();

  let prediction: AiPredictionRow | null = null;
  if (profile?.id) {
    const { data } = await admin
      .from("ai_predictions")
      .select("*")
      .eq("player_profile_id", profile.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    prediction = (data as AiPredictionRow | null) ?? null;
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">AI Insights</div>
          <h1 className="font-display text-3xl tracking-wide mt-1">
            {decodedName}{" "}
            <span className="text-[color:var(--color-muted)]">#{decodedTag}</span>
          </h1>
          <Link
            href={`/stats/${encodeURIComponent(decodedName)}/${encodeURIComponent(decodedTag)}?region=${region}`}
            className="text-sm text-[color:var(--color-muted)] hover:accent-text"
          >
            ← Back to stats
          </Link>
        </div>
        <GenerateButton
          name={decodedName}
          tag={decodedTag}
          region={region}
          hasPrediction={Boolean(prediction)}
        />
      </div>

      {!prediction ? (
        <EmptyState
          icon={Sparkles}
          title="No insights yet"
          description={`Generate grounded predictions for ${decodedName}#${decodedTag} using last 20 matches.`}
          action={
            <GenerateButton
              name={decodedName}
              tag={decodedTag}
              region={region}
              hasPrediction={false}
            />
          }
        />
      ) : (
        <>
          <PredictionCard prediction={prediction} playerName={decodedName} />
          <StrengthsWeaknesses
            strengths={prediction.strengths ?? []}
            weaknesses={prediction.weaknesses ?? []}
            improvements={prediction.improvement_suggestions ?? []}
          />
          <DataSources
            points={prediction.data_points ?? {}}
            bestAgents={prediction.best_agents ?? []}
            weakMaps={prediction.weak_maps ?? []}
          />
          <p className="text-xs text-[color:var(--color-muted)]">
            Generated{" "}
            {new Date(prediction.generated_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            · engine {prediction.engine_version} ·{" "}
            {prediction.llm_used ? "AI-enhanced" : "rules only"}
          </p>
          {profile ? (
            <span className="hidden">{(profile as PlayerProfileRow).id}</span>
          ) : null}
        </>
      )}
    </div>
  );
}
