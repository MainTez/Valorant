---
tags: [meta, conventions]
created: 2026-04-21
---

# Conventions

## Language

- **Code, docs, commits, brain**: English.
- **User-facing UI copy**: English (Surf'n Bulls is Norwegian-staffed but the product ships in English). Localisation is not on the roadmap.
- Team names are proper nouns: **Surf'n Bulls** (apostrophe required; slug `surf-n-bulls`) and **Molgarians** (slug `molgarians`).

## Code style

- **TypeScript strict.** No `any` — use `unknown` + narrowing, or the domain types in `types/domain.ts`.
- **Zod at API boundaries** (route handlers accepting request bodies); trust types within module boundaries.
- No comments unless the _why_ is non-obvious.
- No speculative abstractions. Three similar lines beats a premature helper.
- No backwards-compat shims or feature flags for code we fully control.
- Error handling only at real boundaries (user input via Zod, external APIs via try/catch with fallback).
- `"use client"` only where actually needed (Supabase browser client, components with interactivity). Default to server components.
- `"server-only"` import on files that must never be bundled client-side (Henrik client, insights LLM, supabase admin).

## File / module layout

- **Routes / pages**: `app/(auth)/...` for unauthenticated, `app/(app)/...` for the authed shell, `app/api/...` for route handlers, `app/auth/callback/...` for OAuth return.
- **Reusable UI primitives**: `components/ui/` (shadcn-style).
- **Feature components**: `components/<feature>/` — `dashboard`, `stats`, `insights`, `matches`, `routines`, `tasks`, `chat`, `admin`, `layout`, `common`.
- **Server utilities / integrations**: `lib/` — `supabase/`, `henrik/`, `insights/`, `auth/`, plus `audit.ts`, `utils.ts`, `constants.ts`.
- **Types**: `types/domain.ts` (row shapes + normalized Henrik shapes); `types/database.ts` (placeholder, pending `supabase gen types`).
- **Schema + RLS + seed**: `supabase/migrations/NNNN_name.sql`.
- **Path alias**: `@/*` → repo root (configured in `tsconfig.json`).

## Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- One logical change per commit.
- Don't amend published commits.
- Brain edits use the `docs(brain):` prefix.

## Testing

- **No test suite today.** See [[status]] and [[open-questions]] (test-runner choice).
- When tests arrive: pure functions (`lib/insights/engine.ts`, `lib/utils.ts`) go first — highest value, lowest setup cost.
- RLS tests should run against a local Supabase instance, not mocked — RLS is the integrity boundary and mocks would defeat the purpose.

## Brain conventions

See the brain skill's `references/conventions.md` for the complete set of wiki-link, frontmatter, and naming rules. Key highlights:

- Wiki-links (`[[basename]]`) inside the brain; relative markdown links only when pointing outside the brain (to code, to `CLAUDE.md`).
- Frontmatter on every note — `tags` + `created` minimum, `updated` when modifying, plus `id` / `status` for ADRs.
- One ADR per decision. One session file per calendar day (append, don't overwrite).
- Notes stay short and link-heavy. `status.md` is the one allowed-to-grow exception.
