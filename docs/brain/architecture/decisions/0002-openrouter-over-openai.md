---
id: 0002
status: accepted
date: 2026-04-21
tags: [adr, ai-pipeline]
---

# ADR 0002 — OpenRouter over OpenAI for insight prose

## Context

[[0001-hybrid-ai-insights-engine]] commits us to an LLM as the "coach voice" layer. The decision was which provider. The candidates were OpenAI (direct), Anthropic (direct), or OpenRouter (aggregator). The constraints:

- Zero recurring cost in the prototype phase. This is a private app for two teams — no revenue, no budget line.
- Free-tier must be real, not a marketing trial. Llama 3.1 8B instruct and similar "`:free`" models on OpenRouter are actually free with rate limits we can live with.
- Graceful degradation matters more than prose quality. The rule engine already ships valid English; the LLM is a polish layer.
- The model must accept a system prompt plus a JSON-mode response format. OpenAI-compatible APIs all do.

User explicitly chose OpenRouter over OpenAI during the build session.

## Decision

We call **OpenRouter's `/api/v1/chat/completions` endpoint** (OpenAI-compatible) from `lib/insights/llm.ts`. Default model `meta-llama/llama-3.1-8b-instruct:free`, configurable via `OPENROUTER_MODEL`. Required headers: `Authorization: Bearer ${OPENROUTER_API_KEY}`, `HTTP-Referer`, `X-Title` (OpenRouter uses these for attribution). Temperature 0.4, `max_tokens: 420`, `response_format: { type: "json_object" }`, 12-second abort timeout.

If `OPENROUTER_API_KEY` is missing the LLM layer is a no-op — `enhanceWithLLM` returns the engine's baseline prose with `used: false`.

## Consequences

Good:

- **Zero marginal cost** on free-tier models.
- **Model portability** — swapping to a paid Anthropic / OpenAI model through OpenRouter is a string change; we don't couple to a vendor SDK.
- **Transparent degradation** — the UI badges LLM vs rules explicitly.
- **No extra SDK dependency** — we use `fetch` directly. `lib/insights/llm.ts` stays small.

Bad / tradeoff:

- **Free-tier rate limits.** Nightly regen for two teams' worth of players is small enough to stay within them, but a burst (e.g. cron rerun) could 429. Today the fallback is rules-only text, which is acceptable.
- **Model quality is weaker** than GPT-4-class. The constrained JSON schema and short output (`<= 18 words per suggestion`) hides most of this.
- **We rely on OpenRouter's uptime.** If they go down we degrade to rules-only; not a catastrophic failure mode.

Neutral:

- Attribution headers (`HTTP-Referer`, `X-Title`) are set from `OPENROUTER_APP_URL` / `OPENROUTER_APP_NAME` env vars; keeps OpenRouter happy about downstream apps.

## When to revisit

- If free-tier 429s become the dominant failure mode for insight regeneration → move to a cheap paid model (GPT-4o-mini / Claude Haiku class, still via OpenRouter).
- If prose quality complaints become common from coaches → upgrade model tier.
- If OpenRouter introduces a significant outage or pricing change → either run a direct OpenAI/Anthropic integration or drop back to rules-only permanently.
- If we eventually want tool-calling / function-calling beyond plain JSON → vendor SDKs may be simpler.

## Related

- [[0001-hybrid-ai-insights-engine]]
- [[stack]]
