# CLAUDE.md

**RankTerminal** — a private Next.js 15 web app for two competitive Valorant teams (**Surf'n Bulls** + **Molgarians**) with whitelisted Google OAuth, Supabase + RLS, HenrikDev stats, and hybrid rule-based + OpenRouter AI insights.

## Load this first

**Authoritative project context lives in [docs/brain/index.md](./docs/brain/index.md).** Read it at the start of every session before exploring code. It's an Obsidian-style linked knowledge base with vision, domain model, architecture, roadmap, ADRs, session handoffs, and collaboration meta.

When this file and the brain disagree, the brain wins — update CLAUDE.md to match.

## Stack (one-liner)

Next.js 15 App Router + React 19 + TypeScript strict, Supabase (Postgres + Auth + RLS + Realtime), Tailwind v4 + shadcn primitives, Recharts, HenrikDev Valorant API, OpenRouter free-tier LLM, Vercel cron. Expanded in [`docs/brain/architecture/stack.md`](./docs/brain/architecture/stack.md).

## Commands

```bash
npm run dev         # local dev
npm run build       # production build
npm run start       # start production server
npm run lint        # eslint
npm run type-check  # tsc --noEmit
```

## Session workflow

1. Read `docs/brain/index.md` first.
2. For non-trivial decisions, add an ADR under `docs/brain/architecture/decisions/`.
3. At end of session, append to `docs/brain/sessions/YYYY-MM-DD.md`.

Brain maintenance (ADRs, session notes, stale-checking) may be delegated to a subagent to keep the main context focused — see the brain skill for the delegation pattern.

## Conventions

See [docs/brain/meta/conventions.md](./docs/brain/meta/conventions.md). Keep this `CLAUDE.md` thin — depth belongs in the brain.
