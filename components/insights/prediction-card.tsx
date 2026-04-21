import { ShieldHalf, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AiPredictionRow } from "@/types/domain";
import { ConfidenceMeter } from "./confidence-meter";

interface Props {
  prediction: AiPredictionRow | null;
  playerName: string;
}

export function PredictionCard({ prediction, playerName }: Props) {
  if (!prediction) {
    return (
      <div className="surface p-6">
        <div className="eyebrow">Rank prediction</div>
        <p className="mt-3 text-[color:var(--color-muted)]">
          Generate a prediction for {playerName} to see ranked outlook.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-accent relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, var(--accent-dim), transparent 55%)",
        }}
      />
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">Predicted next rank</span>
            <div className="mt-2 flex items-baseline gap-3">
              <ShieldHalf className="h-7 w-7 text-[color:var(--accent)]" />
              <div className="font-display text-4xl tracking-wide uppercase">
                {prediction.predicted_rank ?? "—"}
              </div>
            </div>
            <div className="text-sm text-[color:var(--color-muted)] mt-2">
              Range:{" "}
              <span className="text-[color:var(--color-text)]">
                {prediction.predicted_rank_low ?? "—"}
              </span>{" "}
              ↔{" "}
              <span className="text-[color:var(--color-text)]">
                {prediction.predicted_rank_high ?? "—"}
              </span>
            </div>
          </div>

          <div className="text-right">
            {prediction.llm_used ? (
              <Badge>AI-enhanced</Badge>
            ) : (
              <Badge variant="outline">Rules only</Badge>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Metric
            label="Confidence"
            value={`${Math.round((prediction.confidence ?? 0) * 100)}%`}
          >
            <ConfidenceMeter value={prediction.confidence ?? 0} />
          </Metric>
          <Metric
            label="Momentum"
            value={formatSigned(prediction.momentum ?? 0)}
            tone={
              (prediction.momentum ?? 0) > 0.05
                ? "pos"
                : (prediction.momentum ?? 0) < -0.05
                  ? "neg"
                  : undefined
            }
          />
          <Metric
            label="Consistency"
            value={`${Math.round((prediction.consistency ?? 0) * 100)}%`}
          />
        </div>

        <div className="mt-5 flex items-center gap-3 text-sm text-[color:var(--color-muted)]">
          <TrendingUp className="h-4 w-4" />
          RR trend per game:{" "}
          <span
            className={cn(
              "font-semibold",
              (prediction.rr_trend ?? 0) > 0 && "text-green-400",
              (prediction.rr_trend ?? 0) < 0 && "text-red-400",
            )}
          >
            {prediction.rr_trend != null
              ? `${prediction.rr_trend > 0 ? "+" : ""}${prediction.rr_trend.toFixed(1)}`
              : "—"}
          </span>
        </div>

        {prediction.reasoning ? (
          <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="eyebrow mb-1">Analyst note</div>
            <p className="text-sm leading-relaxed text-[color:var(--color-text)]/90">
              {prediction.reasoning}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "font-display text-2xl tracking-wider mt-1",
          tone === "pos" && "text-green-400",
          tone === "neg" && "text-red-400",
        )}
      >
        {value}
      </div>
      {children}
    </div>
  );
}

function formatSigned(v: number): string {
  return (v >= 0 ? "+" : "") + (v * 100).toFixed(0) + "%";
}
