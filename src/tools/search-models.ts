import { loadDataset } from "../lib/dataset";
import { deriveDatasetCollections } from "../lib/collections";
import { formatScore } from "../lib/format";
import { sortModelsByKey } from "../lib/ranking";
import { ModelRow } from "../lib/types";

type Input = {
  /**
   * Case-insensitive text to search in the model name, slug, organization, or model family.
   */
  query?: string;
  /**
   * Case-insensitive organization/provider filter, such as OpenAI, Anthropic, Google, Meta, or DeepSeek.
   */
  org?: string;
  /**
   * Maximum number of models to return. Defaults to 10 and is capped at 25.
   */
  limit?: number;
};

/**
 * Search RankedAGI AI models by model name, slug, organization, or family and return a compact ranked list.
 */
export default async function tool(input: Input) {
  const dataset = await loadDataset();
  const { benchmarksByKey } = deriveDatasetCollections(dataset);
  const defaultBenchmark = benchmarksByKey.get(dataset.defaultSortKey);
  const ragiOverall = benchmarksByKey.get("ragi");
  const limit = clampLimit(input.limit);
  const query = normalize(input.query);
  const org = normalize(input.org);

  const models = sortModelsByKey(dataset.models, dataset.defaultSortKey, defaultBenchmark).filter((model) => {
    return matchesQuery(model, query) && (!org || normalize(model.Org).includes(org));
  });

  return {
    matched: models.length,
    sortedBy: defaultBenchmark ? { name: defaultBenchmark.name, key: defaultBenchmark.key } : dataset.defaultSortKey,
    models: models.slice(0, limit).map((model) => ({
      model: model.Model,
      org: model.Org ?? "—",
      slug: model.Slug,
      ragiOverall: ragiOverall ? formatScore(model[ragiOverall.key], ragiOverall) : "—",
      defaultScore: defaultBenchmark ? formatScore(model[defaultBenchmark.key], defaultBenchmark) : "—",
      released: model.Released ?? "—",
    })),
  };
}

function matchesQuery(model: ModelRow, query: string) {
  if (!query) {
    return true;
  }

  return [model.Model, model.Slug, model.Org, model.family].some((value) => normalize(value).includes(query));
}

function clampLimit(limit: number | undefined) {
  return Math.min(Math.max(limit ?? 10, 1), 25);
}

function normalize(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}
