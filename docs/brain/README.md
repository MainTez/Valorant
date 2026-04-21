---
tags: [meta, entrypoint]
created: 2026-04-21
---

# Second Brain

This is an **Obsidian-style knowledge base** for Nexus Team Hub. It's committed with the repo so context survives across Claude sessions and never gets lost to context compaction.

## How to use it

- **Reading**: open [[index]] — it's the Map of Content that links everything.
- **Editing in Obsidian**: open the repo root as a vault (`File → Open folder as vault`). Wiki-links, graph view, and tags work out of the box.
- **Editing in Claude Code**: just edit the `.md` files directly; they're plain markdown.

## Structure

| Folder | Contents |
|---|---|
| [[vision\|product/]] | Vision, domain model, user flows |
| [[stack\|architecture/]] | Stack, data model, ADRs |
| [[status\|roadmap/]] | Status, next up, open questions |
| sessions/ | Dated session handoff notes (`YYYY-MM-DD.md`) |
| [[claude-workflow\|meta/]] | How Claude collaborates here; conventions; glossary |

## Conventions

- **Wiki-links**: use `[[file-basename]]` or `[[path/file|display text]]`. Basenames are unique across the brain.
- **Frontmatter**: every note starts with `---` block containing at least `tags` and `created`.
- **ADRs**: one decision per file under `architecture/decisions/NNNN-title.md`.
- **Sessions**: one file per working day under `sessions/YYYY-MM-DD.md`.

See [[conventions]] for the full list.
