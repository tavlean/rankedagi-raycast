# Roadmap — RankedAGI Raycast extension            (written 2026-07-02 by Claude Fable 5)

**This file is the single source of truth for this initiative's plan and status.** The "Current phase" line and the checkboxes ARE the status. History lives in `docs/WORKLOG.md`. The main site's roadmap lives in the site repo (`../RankedAGI/docs/fable-plans/ROADMAP.md`) and covers a different initiative (score model v2); this initiative deliberately stays out of its way — see "Parallel-work rules" below.

Current phase: **R1 + R2 — endpoint and core commands, started 2026-07-02.**

## Vision

RankedAGI in the launcher: hit the Raycast hotkey, type a model name, and see how it ranks — RAGI composites, every benchmark score, pricing, context, links — without opening a browser. Same for benchmarks: pick SWE-Bench Pro and see how every model ranks on it. Published on the public Raycast Store, where it doubles as a discovery/marketing surface for rankedagi.com. AI tools let Raycast AI answer questions like "how does Opus 4.8 score on SWE-Bench Pro?" from the same data.

## Decisions locked with Tav (2026-07-02)

- **Separate repo (this one)** — zero clash with the score-model sessions running in the site repo. The only site-repo touch is one small additive endpoint (R1).
- **Built to public Raycast Store standards from day one** (review guidelines are encoded in R2/R4 below).
- **v1 scope: Search Models + Search Benchmarks + AI tools.** Menu-bar command and anything else → Later.
- **Data: ONE prerendered JSON endpoint** on rankedagi.com (`/api/export`), fetched with stale-while-revalidate caching; all search/filter/rank happens client-side in the extension. **Real scores only in v1** — the simulated-estimate sidecar (~3.7 MB) stays out; missing cells render as "—" honestly.

## Foundations

**F1 — Data contract, `/api/export` v1** (code lives in the site repo; the contract is owned here).
`{ version: 1, generatedAt, defaultSortKey, benchmarks: [...], models: [...] }` where `models` are the site's *collapsed family rows* (exactly what the homepage shows — one row per model family, representative level leading, `__familySlug`/`__levelLabel` present where relevant) and rows belonging to a multi-level family carry `levels: [...]` — the raw per-level rows with their scores. `benchmarks` are the non-archived definitions (key, name, category, format, ascending, url, ...). Evolution rule: **additive only** — never rename/remove fields in v1; the extension must ignore unknown fields. If a breaking change is ever needed, ship `/api/export` v2 alongside and migrate.

**F2 — Extension data layer.** `src/lib/` (types, data via one `useFetch` of F1, ranking, formatting) is shared by both view commands AND the AI tools — build once, consume three times. This is the research report's recommended architecture (`docs/research/2026-07-02-raycast-docs-report.md`).

## Phases

- [ ] **R1 — `/api/export` endpoint in the site repo** [execute] — a prerendered SvelteKit endpoint next to the existing `/api/ragi-simulated` + `/api/score-provenance` (same pattern: `export const prerender = true`, `json()` with `cache-control: public, max-age=3600`). Composes the F1 shape by reusing the site's own `$lib/families.js` helpers (`collapseModels`, `realBenchmarkKeys`, `getFamilyRows`) so representative/level logic can never drift from the site. Shaping logic in a pure helper + Vitest unit test. Goes live on the next site deploy; until then the extension dev-tests against `npm run dev` on the site repo via its Data URL preference.
  Done when: endpoint returns the F1 shape locally, unit test green, committed to the site repo.

- [ ] **R2 — Extension scaffold + the two core commands** [execute] — this repo becomes a working, store-grade extension:
  - **Search Models** (`view`): `List` with `isShowingDetail`, sorted by the default RAGI composite; fuzzy search over name/org/slug via `keywords`; a `List.Dropdown` search-bar accessory to re-sort by RAGI Overall / Code / Agentic / Reasoning / Math (mirrors the site's composite columns); accessories show rank + composite; detail panel = markdown score table (composites + real benchmark scores, formatted per benchmark `format`/`ascending`) + metadata (org, released, license, pricing, context, links). Level rows of a family render inside the detail (per-level table), not as separate list rows — matching the site. Actions: Open on RankedAGI, Copy Name/Slug, Refresh Data.
  - **Search Benchmarks** (`view`): `List` sectioned by category; detail = benchmark info (metadata) + top-N model ranking table (markdown). Actions: Open Benchmark Website, Open on RankedAGI, Copy Key, Refresh Data.
  - Data via `useFetch` (stale-while-revalidate, `keepPreviousData: true`, failure toast, manual revalidate action); Data URL is a Raycast **preference** defaulting to `https://rankedagi.com/api/export` so dev can point at a local site server.
  - Store-review rules baked in from day one (from the research report): no empty-list flicker (`isLoading`), Title Case actions, search-bar placeholders, no default Raycast icon (site's 512×512 `rankedagi.png` is the icon), MIT license, `package-lock.json` committed, latest `@raycast/api`, no analytics, US English.
  Done when: `npm run build` + `npm run lint` pass and Tav can browse models + benchmarks in Raycast via `npm run dev`.

- [ ] **R3 — AI tools** [execute] — manifest `tools` array + `src/tools/`: `search-models` (query/org/limit → compact ranked list), `get-model` (slug or name → facts + notable scores), `rank-models-by-benchmark` (benchmark key or name → top N), `compare-models` (models[] × benchmarks[] → comparison table). All read-only, built on F2, JSDoc-documented inputs (that's what Raycast AI reads), capped output rows, disambiguation-friendly (benchmark names resolved fuzzily but echoed back precisely). Add `ai.yaml` instructions + a few evals per the current AI-extension docs.
  Depends on: R2. Done when: @rankedagi in Raycast AI answers a scores question correctly end-to-end.

- [ ] **R4 — Store submission** [execute, needs Tav] — icon light/dark check (`icon@dark.png` if needed), 3–6 screenshots at 2000×1250 PNG, `CHANGELOG.md` (`## [Initial Release] - {PR_MERGE_DATE}`), README, metadata categories, then `npm run publish` (opens the PR to `raycast/extensions` automatically; needs Tav's GitHub auth and his **Raycast account handle** in `author` — placeholder `tavlean` must be confirmed first). Repo-level extras (`docs/`, `.claude/`) must not ship in the store PR — the publish flow packages the extension files; verify the PR contents before submitting.
  Depends on: R2 (R3 nice-to-have but v1 with tools reviews better as one submission — decide at submission time whether to wait for R3).
  Done when: extension is live on the Raycast Store.

## Later — deliberately

- **Menu-bar command** — current #1 model (or a pinned model) in the macOS menu bar; background refresh at a conservative interval (6–12 h). Tav explicitly deferred this from v1.
- **Category leaderboard commands** — dedicated commands per composite if the R2 dropdown proves not enough.
- **Simulated-score toggle** — would need the sidecar or a slimmed variant in the export; only if users ask.
- **Compare command (view)** — side-by-side model comparison UI; pairs with the site's own future compare view.
- **Windows** — Raycast is macOS-first; revisit `platforms` when Raycast Windows extension support matures.

## Parallel-work rules (why this can run alongside score model v2)

- This repo is the workspace; the site repo is touched ONLY by R1 (one new additive route + helper + test) and one-line doc pointers. No shared files with Phases 4–6 / Initiative B of the site roadmap.
- The data contract consumes the site's public helpers (`$lib/families.js`); if score-model work changes collapse semantics, the endpoint inherits it automatically — that's a feature, not a clash.
- Site-repo sessions should treat `/api/export` as a public contract: additive changes only (the "For future executors" list in the site ROADMAP points here).

## For future executors

- Read `.claude/PROJECT_BRIEF.md` here first; the full Raycast docs research (with citations, 2026-07-02) is at `docs/research/2026-07-02-raycast-docs-report.md` — follow it over memory; re-verify docs via the raycast-api MCP server if adopting new surface area (AI tools especially — the API is young).
- Versions at research time: `@raycast/api` 1.104.21, `@raycast/utils` 2.2.7. Extension entry files map from manifest command names (`search-models` → `src/search-models.tsx`).
- The extension package sits at the REPO ROOT (npm run dev/build/lint here); project docs live in `docs/` and `.claude/` and must be excluded from any store submission.
- Conventions carried over from the site repo: decisions → `docs/decisions/`, specs → `docs/specs/`, worklog → `docs/WORKLOG.md`; update this file's checkboxes + "Current phase" as phases complete — this binds every model reading it.
- Site repo assumptions that may drift: `data/models.json` had 227 rows on 2026-07-02; endpoint shape is owned by F1 above.
