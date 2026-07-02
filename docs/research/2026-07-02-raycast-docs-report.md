# Raycast Extension Research Report for RankedAGI

Research mode only: no file changes, no commits.

Sources used are current official Raycast developer docs via the Raycast API MCP server, plus `npm view` for current package versions. I also skimmed `data/models.json` and `data/benchmarks.json`; this checkout currently has 227 model records and 83 benchmark definitions. The model records are flat JSON objects with identity fields like `Slug`, `Model`, `Org`, `License`, `Released`, cost/context fields, links, plain-number benchmark scores, and composite `ragi_*` fields. Benchmarks define `key`, `name`, category, format, sort direction, visibility, and display metadata.

## 1. Extension Anatomy Today

Raycast extensions are npm packages whose `package.json` doubles as the Raycast manifest. The official manifest docs describe it as a superset of npm `package.json`, with Raycast-specific metadata such as `name`, `title`, `description`, `icon`, `author`, `platforms`, `categories`, `commands`, optional `tools`, optional `ai`, and preferences. Source: [Manifest](https://developers.raycast.com/information/manifest).

A typical public extension manifest needs:

```json
{
  "name": "rankedagi",
  "title": "RankedAGI",
  "description": "Search AI model and benchmark rankings from RankedAGI.",
  "icon": "icon.png",
  "author": "your-raycast-handle",
  "platforms": ["macOS"],
  "categories": ["Data", "Web"],
  "license": "MIT",
  "commands": [
    {
      "name": "search-models",
      "title": "Search Models",
      "description": "Search AI models and inspect benchmark scores.",
      "mode": "view"
    },
    {
      "name": "search-benchmarks",
      "title": "Search Benchmarks",
      "description": "Search benchmarks and view model rankings.",
      "mode": "view"
    }
  ]
}
```

Command `name` maps directly to the entrypoint file in `src/`, e.g. `search-models` maps to `src/search-models.ts` or `src/search-models.tsx`. Command modes are:

- `view`: pushes a Raycast UI view, appropriate for searchable model and benchmark browsers.
- `no-view`: performs work without pushing UI, useful for opening a URL, copying a value, or background metadata refresh.
- `menu-bar`: returns a `MenuBarExtra` for macOS menu bar display.

Source: [Manifest command properties](https://developers.raycast.com/information/manifest).

Raycast’s getting-started flow creates a TypeScript/React extension. The docs point developers to Raycast’s “Create Extension” command, then `npm install && npm run dev`; the editable entrypoint is shown as `./src/index.tsx`. Source: [Create Your First Extension](https://developers.raycast.com/basics/create-your-first-extension).

Current package versions checked from npm on July 2, 2026:

- `@raycast/api`: `1.104.21`
- `@raycast/utils`: `2.2.7`

The official Store prep docs say to use the latest Raycast API version, use npm, include `package-lock.json`, run `npm run build`, and optionally `npm run lint` before submission. Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).

## 2. List and Detail UI Patterns

For RankedAGI, `List` is the right primary UI. The official `List` docs say it provides built-in filtering, sections, loading indicators, and search-query handling. List items are displayed when the search input fuzzy-matches the item `title` or `keywords`. Source: [List](https://developers.raycast.com/api-reference/user-interface/list).

This maps very cleanly to:

- Model list title: model display name.
- Subtitle: organization, release/version, license, or family.
- Keywords: slug, org, family, benchmark aliases, license.
- Accessories: top composite score, coding/math/reasoning score, release date, cost, context size.
- Sections: “Top Overall,” “Coding,” “Reasoning,” “Math,” or grouped by org/category when useful.
- Search bar accessory: dropdown for category/composite sort, provider, license, or “All / Open / Proprietary.”

A Raycast `List` can comfortably hold roughly 250 client-side items. The docs recommend built-in filtering for best performance and only introduce pagination for larger, paged sources. They also warn memory can grow with extensive pagination, which is not relevant for 227 models plus 83 benchmarks after a single static JSON fetch. Source: [List pagination and filtering](https://developers.raycast.com/api-reference/user-interface/list).

`List.Item.Detail` is a strong fit for model inspection. The docs define it as a detail view on the right side of a `List` and recommend moving extra information into the detail view when `isShowingDetail` is true rather than also using accessories heavily. It supports markdown plus a structured metadata panel. Source: [List.Item.Detail](https://developers.raycast.com/api-reference/user-interface/list).

For model detail, use markdown for human-readable content:

- Heading with model name.
- Short summary of composite scores.
- A compact score table for visible benchmark scores.
- Links to RankedAGI model page and source links.

Use metadata for structured facts:

- Org
- Version
- Release date
- License
- Input/output cost
- Context
- RankedAGI composites
- Source links

For benchmark detail, use a benchmark list where selecting a benchmark shows a right-side ranking table in markdown: rank, model, org, score. Metadata can show category, format, sort direction, website, description, and whether it is a RankedAGI-managed composite.

Standalone `Detail` is useful when navigating deeper from a list item, especially for long markdown tables or explanations. The official `Detail` docs say it renders CommonMark with optional metadata, typically standalone or when navigating from a `List`. Source: [Detail](https://developers.raycast.com/api-reference/user-interface/detail).

`Grid` is less appropriate for the core extension because Raycast says `Grid` is an alternative to `List` when the defining characteristic is an image. RankedAGI is score/ranking data, not image-first content. Source: [Grid](https://developers.raycast.com/api-reference/user-interface/grid).

## 3. Remote JSON Dataset Fetching and Caching

Raycast gives three relevant choices:

- `useFetch` from `@raycast/utils`
- `useCachedPromise` from `@raycast/utils`
- `Cache` from `@raycast/api`

`useFetch` fetches a URL and follows stale-while-revalidate: it returns cached stale data first, then fetches fresh data, then updates with the current response. The docs say the last value is kept between command runs. It supports `parseResponse`, `mapResult`, `initialData`, `keepPreviousData`, `onError`, `onData`, `revalidate`, and `mutate`. Source: [useFetch](https://developers.raycast.com/utilities/react-hooks/usefetch).

`useCachedPromise` wraps an arbitrary async function, also follows stale-while-revalidate, keeps the last value between command runs, supports `abortable`, and requires returned values to be JSON serializable. Source: [useCachedPromise](https://developers.raycast.com/utilities/react-hooks/usecachedpromise).

`Cache` is lower-level. It stores string data on disk with LRU behavior, defaults to 10 MB capacity, and is shared between commands unless namespaced. Values must be strings, so JSON data requires `JSON.stringify` and `JSON.parse`. Source: [Cache](https://developers.raycast.com/api-reference/cache).

For RankedAGI’s likely 1-2 MB static JSON, the best pattern is:

1. Publish a compact extension dataset endpoint on `rankedagi.com`, ideally one file such as `/raycast-data.json` containing models, benchmark definitions, and generated indexes.
2. Use `useFetch` in both view commands with `parseResponse` and `mapResult`.
3. Let stale-while-revalidate provide instant repeat opens and background freshness.
4. Use `initialData` only if bundling a small fallback snapshot, or show loading until first successful fetch.
5. Add a manual `Refresh Data` action calling `revalidate()`.
6. Add a clear failure empty state: “Couldn’t refresh data” while continuing to show stale data when available.

Example shape:

```ts
const { data, isLoading, error, revalidate } = useFetch(DATA_URL, {
  parseResponse: async (response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as RankedAgiDataset;
  },
  keepPreviousData: true,
  failureToastOptions: {
    title: "Could not refresh RankedAGI data"
  }
});
```

I would prefer `useFetch` over `useCachedPromise` for a plain static URL because it directly models this case and already handles parsing hooks. Use `useCachedPromise` if we need to fetch multiple files, merge local fallback data, compute expensive derived indexes asynchronously, or support an abort controller around a custom fetch pipeline.

For a single 1-2 MB static payload, `Cache` is useful as an explicit shared cache only if we introduce menu-bar/background commands or AI tools that need the same dataset outside React hooks. Otherwise, `useFetch`’s built-in stale-while-revalidate cache is enough.

Offline behavior: after one successful load, `useFetch`/`useCachedPromise` should show the last cached value between command runs, then attempt refresh. If refresh fails, keep rendering existing `data` where available and expose a retry action. The docs do not claim permanent offline guarantees beyond cached last value, so avoid promising full offline mode unless we also bundle a snapshot or manage `Cache` ourselves.

## 4. Menu-Bar Commands

Menu-bar commands use `MenuBarExtra` and `mode: "menu-bar"` in the manifest. They are macOS-only. Source: [Menu Bar Commands](https://developers.raycast.com/api-reference/menu-bar-commands).

A menu-bar command can show an icon, title, tooltip, sections, items, submenus, and actions. It can also return `null` to remove the item. The command is not a long-lived process: Raycast loads it, executes it, and unloads it when it can. If `isLoading` is used, it must become `false` when async work completes. Source: [Menu Bar Commands lifecycle](https://developers.raycast.com/api-reference/menu-bar-commands).

Background refresh is configured by adding `interval` to `no-view` or `menu-bar` commands. The background refresh docs say intervals can use seconds, minutes, hours, or days, but scheduling is not exact and macOS may vary execution to optimize energy. They recommend choosing the highest useful interval, handling network errors, finishing quickly, and being defensive with shared state. Source: [Background Refresh](https://developers.raycast.com/information/lifecycle/background-refresh).

For RankedAGI, a menu-bar command is optional. Worthwhile versions:

- Show current top overall model: `#1 Claude Sonnet 5` or a short icon-only tooltip.
- Menu sections for “Overall,” “Coding,” “Reasoning,” “Math.”
- Actions to open RankedAGI, open “Search Models,” or refresh.

But I would not include menu-bar in v1 unless there is a strong product reason. The main value is search/browse, and menu-bar extras are scarce screen real estate. If added, use a conservative interval like `6h` or `12h` because the static leaderboard likely does not need minute-level refresh.

## 5. Raycast AI Extensions and Tools

Raycast AI Extensions are regular extensions with tools. Once an extension has tools, users can `@mention` it in Quick AI, AI Chat, or AI Commands, and Raycast AI may call one or more tools. Source: [AI Extension terminology](https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions).

Tools are functions in `src/tools/`. The manifest supports a top-level `tools` array where each tool has `name`, `title`, `description`, and optional icon. Tool names map to `src/tools/<name>.ts` or `.tsx`. Source: [Manifest tool properties](https://developers.raycast.com/information/manifest).

Tool inputs must be a single object. Raycast recommends JSDoc comments on tools and input fields so AI knows when and how to use them. Tools can also export a confirmation function for human-in-the-loop actions, though RankedAGI would likely only expose read-only tools. Source: [Learn Core Concepts of AI Extensions](https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions).

The AI docs also support extension-level instructions and evals, preferably in `ai.yaml` once they get long. Source: [AI Extension instructions and evals](https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions).

For RankedAGI, AI tools are worth considering, but not necessary for v1. Useful read-only tools:

- `search-models`: input `{ query?: string; org?: string; benchmarkKey?: string; limit?: number }`; returns compact ranked models.
- `get-model`: input `{ slugOrName: string }`; returns model facts and notable scores.
- `rank-models-by-benchmark`: input `{ benchmarkKeyOrName: string; limit?: number }`; returns top rankings.
- `compare-models`: input `{ models: string[]; benchmarkKeys?: string[] }`; returns comparison table.

Adoption recommendation: build the two view commands first. Add tools in v1.1 after the data normalization layer is stable. AI tools are compelling because users can ask natural-language questions like “Which open model is best at coding?” but the value depends on careful output limits, strong descriptions, and evals.

## 6. Publishing

The current public publishing flow is PR-based. The official docs say to run `npm run build` to validate, then `npm run publish`; the publish script uses GitHub authentication and automatically opens a pull request in `raycast/extensions`. If the script is missing, add `"publish": "npx @raycast/api@latest publish"`. Source: [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension).

There is also a manual path: fork `raycast/extensions`, add the extension to the fork, push, and open a PR to Raycast’s `main` branch. Once accepted, the PR is merged and the extension is automatically published to the Raycast Store. Source: [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension).

Common review requirements and pitfalls from the Store prep docs:

- Use your Raycast account username in `author`.
- Use `MIT` license.
- Use the latest Raycast API version.
- Match `platforms` to the extension; menu-bar is macOS-only.
- Use npm and include `package-lock.json`.
- Check third-party terms.
- Run `npm run build` locally; run `npm run lint` too.
- Use Apple-style Title Case for extension, command, and action titles.
- Avoid vague extension names and vague command names.
- Do not use the default Raycast icon.
- Do not include external analytics.
- Use US English.
- Do not introduce custom navigation stacks; use Raycast navigation.
- Avoid flickering empty states by not rendering empty lists before data loads.
- Provide search bar placeholders.
- Keep navigation titles short and do not overuse root `navigationTitle`.

Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).

Icon requirements:

- 512x512 PNG.
- Must look good in light and dark themes.
- Use `icon.png` and optionally `icon@dark.png`.
- Default Raycast icon is rejected.

Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store) and [Manifest](https://developers.raycast.com/information/manifest).

Screenshot requirements:

- Maximum six screenshots.
- Raycast recommends at least three.
- Size: 2000 x 1250 pixels, 16:10, PNG.
- Use consistent background.
- Do not show sensitive data.
- Keep focus on the extension inside Raycast.

Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).

Version history:

- Add `CHANGELOG.md` at extension root.
- Use `## [Change Title] - {PR_MERGE_DATE}` format for new entries.

Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).

Can source also live in our own repo? Yes, practically: keep development source in the RankedAGI repo or a companion repo, then publish through the Raycast flow that opens or updates a PR in `raycast/extensions`. The Store submission ultimately needs the extension source in the Raycast extensions repository for public distribution. The docs describe both automatic and manual PR flows into `raycast/extensions`. Source: [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension).

Private options exist for organizations. To publish privately, set `owner` to the organization handle; with no public access, `npm run publish` publishes to the organization’s private store, available only to members. Source: [Publish a Private Extension](https://developers.raycast.com/teams/publish-a-private-extension). The manifest also has `access` as `"public"` or `"private"`; public extensions are downloadable by anyone, private ones only by org members. Source: [Manifest](https://developers.raycast.com/information/manifest).

I did not find an official “unlisted public extension” mode in the current docs. The documented options are public Store distribution or private organization store distribution.

## 7. Newer Features Worth Adopting and Pitfalls

Worth adopting:

- `@raycast/utils` `useFetch` for stale-while-revalidate dataset loading. Source: [useFetch](https://developers.raycast.com/utilities/react-hooks/usefetch).
- `List.Item.Detail` metadata panels for structured scores/facts. Source: [List](https://developers.raycast.com/api-reference/user-interface/list).
- `List.Dropdown` as `searchBarAccessory` for category/provider/license filters. Source: [List](https://developers.raycast.com/api-reference/user-interface/list).
- `Action.OpenInBrowser`, `Action.CopyToClipboard`, and `Action.Push` style navigation for model and benchmark pages.
- AI tools later, once the ranking/search utilities are stable. Source: [Create an AI Extension](https://developers.raycast.com/ai/create-an-ai-extension).
- Optional `CHANGELOG.md` for Store version history. Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).

Pitfalls for this extension:

- Do not render an empty `List` while the JSON is still loading; use `isLoading` to avoid flicker. Source: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store).
- Keep action titles Title Case.
- Do not overload list accessories when `isShowingDetail` is enabled; put dense score data in the detail panel.
- Do not paginate local 227/83 data unnecessarily.
- Do not show too many score accessories at once; Raycast list rows work best when scannable.
- Do not fetch per keystroke. Fetch the dataset once, then filter client-side.
- Avoid external analytics.
- If menu-bar is added, use a high refresh interval and ensure `isLoading` becomes `false`.
- If exposing AI tools, cap returned rows and include enough benchmark metadata to prevent ambiguous names like “Arena” or “Math.”

## Recommended Architecture Sketch

Use a small extension-local data layer shared by both commands:

```txt
src/
  search-models.tsx
  search-benchmarks.tsx
  lib/
    data.ts
    format.ts
    ranking.ts
    types.ts
    actions.tsx
```

`lib/data.ts`:

- `DATA_URL = "https://rankedagi.com/raycast-data.json"` or similar.
- `useRankedAgiData()` wraps `useFetch`.
- Parse into `{ models, benchmarks, updatedAt }`.
- Build lookup maps:
  - `modelsBySlug`
  - `benchmarksByKey`
  - visible benchmarks
  - benchmarks grouped by category
- Optionally precompute rank arrays per benchmark on load.

`lib/ranking.ts`:

- `getScore(model, benchmarkKey)`
- `sortModelsForBenchmark(models, benchmark)`
- `getTopBenchmarksForModel(model, benchmarks)`
- `formatScore(score, benchmark.format, benchmark.displayMode)`
- Respect `ascending`.

Command 1: `Search Models`

- `List isShowingDetail isLoading={isLoading}`.
- Built-in filtering with rich `keywords`.
- Optional dropdown: Overall, Coding, Agentic, Reasoning, Math, Provider, License.
- Items sorted by `ragi` by default.
- Accessories: rank, `ragi`, org, release year/version.
- Detail markdown: compact score table for main composites and notable benchmark scores.
- Detail metadata: org, license, costs, context, release, links.
- Actions:
  - Open Model on RankedAGI
  - Copy Model Name
  - Copy Slug
  - Refresh Data
  - Open Source Link(s)

Command 2: `Search Benchmarks`

- `List isShowingDetail isLoading={isLoading}`.
- Sections by benchmark category, or a dropdown category filter.
- Items title: benchmark name; subtitle: category/description.
- Accessories: format, direction, “RAGI”/external tag.
- Detail markdown: top N model rankings for selected benchmark.
- Detail metadata: category, format, ascending/descending, website, description, hidden/managed flags where relevant.
- Actions:
  - Open Benchmark Website
  - Open RankedAGI
  - Copy Benchmark Key
  - Refresh Data

Data strategy:

- Fetch one compact static JSON, not separate per-command endpoints.
- Keep all filtering and ranking client-side.
- Use `useFetch` stale-while-revalidate for instant reopen behavior.
- Add a bundled fallback snapshot only if first-run offline matters.
- Add AI tools later using the same `lib/data.ts` and `lib/ranking.ts`, returning compact read-only JSON/markdown summaries.