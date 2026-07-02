# Worklog

Newest entries first. Every session that changes the project appends: date, what changed, why, gotchas for the next model.

## 2026-07-02 — Repo founded; R1 + R2 built (extension works headless; Raycast try pending)

- Session flow: Tav's brief → Raycast docs research (report in `docs/research/`, cited) → alignment answers locked (separate repo / public Store / v1 = two commands + AI tools) → roadmap → build.
- **R1** (site repo): `/api/export` prerendered endpoint, unit-tested, committed there (`3b452b2`). Live after the next site deploy; until then use a local site dev server via the Data URL preference.
- **R2** (this repo): full extension built — manifest (2 view commands + `dataUrl` preference), `src/lib/` data layer (`useFetch` stale-while-revalidate), Search Models (composite dropdown, rank accessories, detail with composites/benchmarks/levels tables + metadata + links), Search Benchmarks (RAGI Composites section + category sections, top-20 ranking tables). `npm run build` and `npm run lint` pass clean.
- Executed by Codex from a spec-grade brief; review caught one real bug: `links` in the payload are `{title, url}` OBJECTS, not strings — types + rendering fixed (also `reasoningEffort` is a number). **Gotcha: always code against `docs/research/api-export-sample.json`, not assumptions.**
- Icon: `assets/icon.png` (site's 512×512 logo, own background — works light/dark; a stray root-level duplicate was removed, `ray lint` resolves icons from `assets/`).
- Data facts that bite: percent scores are FRACTIONS 0–1 (×100 for display); benchmark display name = `name` alone (never name + subtitle — doubles the qualifier); `ascending: true` means lower is better.
- Next: Tav runs `npm run dev` here and browses both commands in Raycast — that ticks R2. R3 (AI tools) started same session.
