# Project Brief — RankedAGI Raycast extension          (updated: 2026-07-02, at creation)

## What this is
A Raycast extension that puts rankedagi.com in the launcher: search any AI model and see its RAGI composites, benchmark scores, pricing and links; search any benchmark and see how every model ranks on it; ask Raycast AI scores questions via extension tools. Target: the public Raycast Store (it doubles as marketing for the site). Built and operated by Tav (solo), same working style as the site repo: plain language, low cognitive load, checkpoint commits, extensive docs.

## Relationship to the site repo
The site repo at `~/Development/Tavlean/RankedAGI` is the data source and a SEPARATE initiative (score model v2 runs there in parallel sessions). This repo must not require changes there beyond the one additive `/api/export` endpoint (roadmap phase R1). The endpoint's JSON shape is contract F1 in `docs/fable-plans/ROADMAP.md` — additive evolution only.

## Architecture in brief
- Standard Raycast extension: npm package at the REPO ROOT (`package.json` doubles as the Raycast manifest), TypeScript + React, `@raycast/api` + `@raycast/utils`.
- Commands map manifest names to `src/<name>.tsx`: `search-models`, `search-benchmarks`; AI tools live in `src/tools/` (phase R3).
- One dataset: `useFetch` of `/api/export` (stale-while-revalidate; Data URL is a user preference defaulting to `https://rankedagi.com/api/export`, overridable to a local site dev server). All filtering/ranking client-side in `src/lib/` (types, data hook + lookup maps, ranking, formatting) — shared by view commands and AI tools.
- Real scores only in v1; missing cells render "—". No simulated estimates.

## Current state
- Created 2026-07-02: roadmap + research done, scaffold + two core commands in progress (see ROADMAP "Current phase" line — that file is the single source of truth for status).

## Constraints & conventions
- Store review rules from day one: no default icon (use the site's 512×512 logo), Title Case actions, `isLoading` (no empty-list flicker), search placeholders, MIT, `package-lock.json` committed, latest `@raycast/api`, no analytics, US English.
- `docs/` and `.claude/` never ship in a store submission (the store PR carries only extension files).
- Validate with `npm run build` and `npm run lint` (ray CLI via @raycast/api). Manual test: `npm run dev` opens it in Raycast.
- Tav's Raycast account handle must be confirmed before store submission (`author` field; placeholder `tavlean`).

## Pointers
- Plan + status: `docs/fable-plans/ROADMAP.md` (single source of truth)
- Raycast docs research (cited, 2026-07-02): `docs/research/2026-07-02-raycast-docs-report.md`; live docs via the raycast-api MCP server
- Site repo brief: `~/Development/Tavlean/RankedAGI/.claude/PROJECT_BRIEF.md`
- Fable conventions: decisions → `docs/decisions/`, specs → `docs/specs/`, worklog → `docs/WORKLOG.md`
