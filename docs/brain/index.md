---
tags: [moc, entrypoint]
created: 2026-04-21
updated: 2026-04-21
---

# Index — Map of Content

**Start here every session.** Nexus Team Hub is a private Next.js 15 web app for two competitive Valorant teams: **Surf'n Bulls** (Norwegian, gold) and **Molgarians** (red).

## Product

- [[vision]] — what Nexus Team Hub is, who it's for, success criteria
- [[domain-model]] — teams, users, player profiles, matches, routines, tasks, AI predictions
- [[user-flows]] — login + whitelist, stats lookup, AI insight, match log, chat

## Architecture

- [[stack]] — Next.js 15 App Router, Supabase, HenrikDev, OpenRouter, Vercel cron
- [[data-model]] — Supabase schema walkthrough, RLS model, henrik_cache strategy
- [[0001-hybrid-ai-insights-engine|ADR 0001 — Hybrid AI insights engine]] (accepted)
- [[0002-openrouter-over-openai|ADR 0002 — OpenRouter over OpenAI]] (accepted)
- [[0003-team-isolation-via-supabase-rls|ADR 0003 — Team isolation via Supabase RLS]] (accepted)
- [[0004-henrik-proxy-cache-strategy|ADR 0004 — HenrikDev proxy + cache strategy]] (accepted)

## Roadmap

- [[status]] — what shipped in `6c04870`, what's stubbed, what's missing
- [[next-up]] — ordered near-term work (Supabase project bringup, OAuth, real rosters)
- [[open-questions]] — what's still undecided

## Sessions

- [[2026-04-21]] — bootstrap + greenfield platform build

## Meta

- [[claude-workflow]] — how Claude and the user collaborate here
- [[conventions]] — project conventions (language, code style, git, testing)
- [[glossary]] — Valorant + domain + tech terms
