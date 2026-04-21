---
id: 0001
status: accepted
date: 2026-04-21
tags: [adr, ai-pipeline]
---

# ADR 0001 — Hybrid AI insights engine (rules + LLM phrasing)

## Context

Players and coaches want a "what rank will I be next month" prediction with an explanation, plus concrete things to work on. Pure-LLM insights are unreliable (the model invents numbers that feel plausible and anchor the coach's attention on nothing). Pure-rule-based insights are auditable but read like an Excel export.

The dataset we can draw on is small per player (typically 10–20 recent matches from HenrikDev plus a short MMR history). That's too noisy for a learned model and more than enough for deterministic rules: momentum (recent vs older ACS), consistency (ACS stdev / mean), RR trend (slope over last 10 games), win rate, best agents, weak maps, and a projected rank from `currentRankIndex + (winRate × weight + rrTrend weight)`. Because every feature ties to a data point, we can show the player _why_ we said what we said.

The spec called for the explanation to sound like a coach, not a spreadsheet. An LLM is the right tool for that — _if_ we can prevent it from touching the numbers.

## Decision

We ship a two-layer insights engine:

1. **Rule-based engine** (`lib/insights/engine.ts`) is the source of truth. It computes `predicted_rank` (+ low/high), `confidence`, `momentum`, `consistency`, `rr_trend`, `win_rate`, `best_agents`, `weak_maps`, `strengths`, `weaknesses`, `improvement_suggestions`, and a baseline `summary`. Every numeric field written to `ai_predictions` comes from this engine.
2. **LLM enhancement** (`lib/insights/llm.ts`) takes the engine output and produces a 2–3 sentence coach summary + 3 imperative improvement suggestions. The system prompt forbids changing any numeric prediction and requires strict JSON `{summary, suggestions}`. The LLM may replace the `reasoning` field and `improvement_suggestions` array only.
3. `ai_predictions.llm_used` is `true` iff the LLM call succeeded. The UI shows an "LLM used" or "Rules only" badge accordingly.

## Consequences

Good:

- **Numbers are always auditable.** `data_points` JSONB on `ai_predictions` captures the inputs; the engine code is <500 lines and readable.
- **Graceful degradation.** Missing `OPENROUTER_API_KEY`, network failure, malformed JSON from the model, or the 12-second abort timeout all fall back to the rule-engine prose with the same numbers.
- **Prompt is short and constrained.** `response_format: { type: "json_object" }`, temperature 0.4, `max_tokens: 420`. Cost stays near zero on the free tier.
- **The "coach voice" is cheap.** Swapping models (free-tier churn or a paid upgrade later) is a config change via `OPENROUTER_MODEL`.

Bad / tradeoff:

- **The LLM can still hallucinate _prose_** — it could claim something not in the data points. We partially mitigate by requiring it to cite a data point in at least one suggestion, but we don't validate that. A future check could regex for data-point tokens.
- **Two codepaths for insight text** (rules-only fallback prose and LLM prose). Tests would catch drift, but we have no tests yet.

Neutral:

- The split means the engine is the only thing that needs to evolve as we learn what makes a good Valorant rank prediction; the LLM layer stays stable.

## When to revisit

- If the free-tier OpenRouter model stops producing usable JSON more than ~10% of the time → tune the prompt or move to a paid model via [[0002-openrouter-over-openai]].
- If we gain enough labelled data (say 500+ matches per team with known outcome-vs-prediction) to train a small model → the rule engine becomes the baseline and we layer a learned adjustment on top.
- If users complain the prose feels repetitive → raise temperature or rotate models.

## Related

- [[0002-openrouter-over-openai]]
- [[stack]]
- [[domain-model]]
