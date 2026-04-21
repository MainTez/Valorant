---
tags: [meta, workflow]
created: 2026-04-21
---

# Claude Workflow

How Claude and the user collaborate on Nexus Team Hub.

## Session ritual

1. **At start**: read [[index]] before touching code. Scan [[status]] and the most recent session note under `sessions/` to pick up the thread.
2. **During**: when a non-trivial decision is made (tech, data model, breaking API, new subsystem), write an ADR under `architecture/decisions/NNNN-short-title.md`. Context → Decision → Consequences → When to revisit.
3. **At end**: append a dated session note under `sessions/YYYY-MM-DD.md` summarising:
   - What changed (grouped by area)
   - Decisions made (link ADRs)
   - Gotchas worth remembering
   - Open threads for next session

## Where things go

| Content | Home |
|---|---|
| Product / vision / flows | `product/` |
| Tech / data / subsystems | `architecture/` |
| Decision with rationale | `architecture/decisions/` (ADR) |
| Snapshot of "what's done / not done" | `roadmap/status.md` |
| Ordered TODO list | `roadmap/next-up.md` |
| Undecided questions | `roadmap/open-questions.md` |
| Dated handoff | `sessions/YYYY-MM-DD.md` |
| Collaboration / conventions / terms | `meta/` |

## ADR conventions

See [[conventions]] and the brain skill's `references/adr-format.md`.

## Stale-catcher check (session end)

Before closing:

- [[status]] — does the ✅/⚠️/❌ bucketing match reality? Particularly the "⚠️" row about `types/database.ts` — flip it to ✅ when `supabase gen types` is wired up.
- [[stack]], [[data-model]] — do paths / table names / module boundaries match the code?
- [[index]] — are new ADRs and session notes linked?

Fix what drifted. The brain earns its keep only if it's trustworthy.

## Project-specific rules

- **Do not commit unless the user explicitly asks.** The user commits themselves.
- **Do not modify files outside `docs/brain/` during brain maintenance** except the root `CLAUDE.md`.
- **Team names are load-bearing.** "Surf'n Bulls" with the apostrophe, not "Surf N Bulls" / "Surf-n-Bulls". The slug form is `surf-n-bulls`.
- **No placeholders in committed brain files.** Use absolute dates (ISO format, from environment context), real facts, real filenames.

## Subagent-friendly brain maintenance

For non-trivial brain updates (writing ADRs, stale-checking, bootstrapping), Claude should prefer spawning a subagent with a focused prompt rather than doing it in the main conversation. This spares the parent context window and keeps the main thread focused on the task the user actually asked for.
