import "server-only";
import type { EngineOutput } from "./engine";

export interface LLMResult {
  used: boolean;
  reasoning: string;
  improvementSuggestions: string[];
}

const SYSTEM_PROMPT = `You are a Valorant performance coach.
You will receive a JSON snapshot of a player's recent stats and the OUTPUT of a rule-based prediction engine.
RULES:
- You MUST NOT change the numeric predictions (predictedRank, confidence, momentum, winRate, rrTrend, etc).
- Write ONE 2-3 sentence analyst summary grounded ONLY in the data points provided. No speculation.
- Then list 3 concrete improvement suggestions as imperative short sentences (<= 18 words each).
- Cite a specific data point in at least one of the suggestions (e.g., "HS 18%").
- Output STRICT JSON: {"summary":"...","suggestions":["...","...","..."]}`;

export async function enhanceWithLLM(params: {
  player: { name: string; tag: string; currentRank: string | null };
  engine: EngineOutput;
}): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return {
      used: false,
      reasoning: params.engine.summary,
      improvementSuggestions: params.engine.improvementSuggestions,
    };
  }

  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
  const appUrl = process.env.OPENROUTER_APP_URL || "http://localhost:3000";
  const appName = process.env.OPENROUTER_APP_NAME || "RankTerminal";

  const userPayload = JSON.stringify({
    player: params.player,
    engineOutput: {
      predictedRank: params.engine.predictedRank,
      predictedRankLow: params.engine.predictedRankLow,
      predictedRankHigh: params.engine.predictedRankHigh,
      confidence: params.engine.confidence,
      momentum: params.engine.momentum,
      consistency: params.engine.consistency,
      winRate: params.engine.winRate,
      winRateRecent: params.engine.winRateRecent,
      rrTrend: params.engine.rrTrend,
      bestAgents: params.engine.bestAgents,
      weakMaps: params.engine.weakMaps,
      strengths: params.engine.strengths,
      weaknesses: params.engine.weaknesses,
      dataPoints: params.engine.dataPoints,
    },
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": appUrl,
        "X-Title": appName,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 420,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return fallback(params.engine);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return fallback(params.engine);

    const parsed = safeJson(raw);
    if (!parsed) return fallback(params.engine);

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : params.engine.summary;
    const suggestions =
      Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
        ? parsed.suggestions
            .filter((s): s is string => typeof s === "string")
            .slice(0, 4)
        : params.engine.improvementSuggestions;

    return { used: true, reasoning: summary, improvementSuggestions: suggestions };
  } catch {
    return fallback(params.engine);
  }
}

function fallback(engine: EngineOutput): LLMResult {
  return {
    used: false,
    reasoning: engine.summary,
    improvementSuggestions: engine.improvementSuggestions,
  };
}

function safeJson(s: string): { summary?: unknown; suggestions?: unknown } | null {
  try {
    return JSON.parse(s);
  } catch {
    // Try to extract a JSON object from surrounding text
    const match = s.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
