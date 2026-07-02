# CLAUDE.md

## Docs first, docs always fresh

- **Before starting ANY work on this project, read the docs.** They live in the wiki — locally `../rankedagi-raycast.wiki/`, on GitHub at `github.com/tavlean/rankedagi-raycast/wiki`. Start with Home, then the page for your area: **Roadmap** (plan + status, single source of truth), **Data-Contract** (`/api/export` — read before touching any data code), **Architecture** (internals + conventions), **Worklog** (history + gotchas).
- **Keep docs fresh as you work, not after.** When work lands (or changes direction mid-flight), update the affected wiki pages in the same session — status lines, checkboxes, contracts, gotchas — and append a Worklog entry. Create new wiki pages when a topic doesn't fit an existing one. Stale docs are bugs: if you notice any page contradicting reality, fix it even if it isn't your task. The wiki is a git repo — commit and push it like code.
- **Never add documentation to THIS repo.** It ships to the Raycast Store verbatim. `.claude/PROJECT_BRIEF.md` here is a local, untracked pointer — not documentation.
- **Twin-doc rule:** any `/api/export` contract change updates BOTH the wiki's Data-Contract page and the site repo's `docs/api-export.md` (`~/Development/Tavlean/RankedAGI`).

## Working agreements

- Validate every change: `npm run build` + `npm run lint`; manual test via `npm run dev` (opens in Raycast).
- Commit per change. Data code is written against the wiki's `api-export-sample.json` — real payload shapes, not assumptions.
