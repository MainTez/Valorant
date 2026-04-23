---
tags: [roadmap, open-question]
created: 2026-04-21
---

# Open Questions

Live questions with no decision yet. Resolved ones move to an ADR under `architecture/decisions/`.

## Which test runner and e2e framework?

**Options**: Vitest + React Testing Library; Playwright; both (Vitest for units, Playwright for e2e).
**Tradeoff**: Vitest integrates with Next.js but its RLS coverage story is weak. Playwright gives real e2e + RLS-via-HTTP coverage but is slower.
**Default lean**: Both — Vitest for `lib/insights/engine.ts` (pure functions, high value) and Playwright for auth flow + a couple of happy-path app pages. Skip component tests for now.
**Blocked on**: [[next-up|next-up #7]] — picking one once there's a real project to test against.

## Notifications panel — pull or push?

**Options**: (a) Client polls `activity_events` every 30s. (b) Subscribe via Supabase Realtime to `activity_events` filtered by `team_id`. (c) Use the existing `chat_messages` Realtime plumbing and extend to `activity_events`.
**Tradeoff**: Polling is cheap to ship but wastes DB round-trips. Realtime is almost free given we already use it for chat.
**Default lean**: (b). We already have the Realtime client wired; the subscription shape is nearly identical. The notification bell becomes functional with ~50 lines.
**Blocked on**: nothing — just prioritisation.

## Mobile/tablet support

**Options**: (a) Leave desktop-only. (b) Minimum-viable responsive — shrink sidebars, stack the chat rail. (c) Proper mobile design pass.
**Tradeoff**: Coaches probably do match-day work from laptops; players might want chat on phones.
**Default lean**: (b) for chat + dashboard only; defer (c) until there's a clear user signal.
**Blocked on**: user feedback from the two teams once they're on the live app.

## Which free-tier OpenRouter model should be the default?

**Options**: `meta-llama/llama-3.1-8b-instruct:free` (current), a newer free Llama variant, a free Mistral, a free DeepSeek.
**Tradeoff**: Llama 3.1 8B works but sometimes misses the "cite a data point" requirement. Newer free models rotate on OpenRouter frequently.
**Default lean**: Stay on Llama 3.1 8B until the coach UX feedback says otherwise; the model string is env-driven so this is a config change, not a code change.
**Blocked on**: observation after real use.

## Resolved (see ADRs)

- **AI insight architecture: pure LLM vs rule engine vs hybrid** → [[0001-hybrid-ai-insights-engine]].
- **LLM provider: OpenAI vs Anthropic vs OpenRouter** → [[0002-openrouter-over-openai]].
- **Multi-team isolation: app-level filters vs RLS vs per-team DB** → [[0003-team-isolation-via-supabase-rls]].
- **Henrik access pattern: direct-from-client vs server proxy + cache** → [[0004-henrik-proxy-cache-strategy]].
- **VOD pipeline: external link vs embed vs private upload** → [[0005-private-match-vod-uploads]].
