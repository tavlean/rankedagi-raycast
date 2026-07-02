import { deriveDatasetCollections } from "../lib/collections";
import { loadDataset } from "../lib/dataset";
import { formatScore } from "../lib/format";
import { resolveBenchmark, resolveModel } from "../lib/resolve";
import { BenchmarkDef, ModelRow } from "../lib/types";

type Input = {
  /**
   * Model names or slugs to compare. Provide 2 to 5 models.
   */
  models: string[];
  /**
   * Optional benchmark keys or names. Defaults to the five RAGI composite scores.
   */
  benchmarks?: string[];
};

/**
 * Compare 2 to 5 RankedAGI models across RAGI composites or selected benchmarks.
 */
export default async function tool(input: Input) {
  const dataset = await loadDataset();
  const { composites } = deriveDatasetCollections(dataset);
  const modelQueries = input.models ?? [];

  if (modelQueries.length < 2 || modelQueries.length > 5) {
    return { error: "Provide 2 to 5 models to compare." };
  }

  const resolvedModels: ModelRow[] = [];
  const modelErrors = [];

  for (const query of modelQueries) {
    const resolution = resolveModel(dataset, query);

    if (resolution.status === "found") {
      resolvedModels.push(resolution.item);
    } else {
      modelErrors.push({
        query,
        error: resolution.status === "ambiguous" ? "Ambiguous model" : "Model not found",
        candidates: resolution.candidates.map((model) => model.Model),
      });
    }
  }

  if (modelErrors.length > 0) {
    return { errors: modelErrors };
  }

  const benchmarkResolution = resolveBenchmarks(input.benchmarks, dataset.benchmarks, composites);

  if ("errors" in benchmarkResolution) {
    return benchmarkResolution;
  }

  return {
    models: resolvedModels.map((model) => ({ model: model.Model, org: model.Org ?? "—", slug: model.Slug })),
    benchmarks: benchmarkResolution.benchmarks.map((benchmark) => ({
      benchmark: benchmark.name,
      key: benchmark.key,
      scores: Object.fromEntries(
        resolvedModels.map((model) => [model.Model, formatScore(model[benchmark.key], benchmark)]),
      ),
    })),
  };
}

function resolveBenchmarks(queries: string[] | undefined, allBenchmarks: BenchmarkDef[], composites: BenchmarkDef[]) {
  if (!queries || queries.length === 0) {
    return { benchmarks: composites };
  }

  const benchmarks: BenchmarkDef[] = [];
  const errors = [];

  for (const query of queries) {
    const resolution = resolveBenchmark(allBenchmarks, query);

    if (resolution.status === "found") {
      benchmarks.push(resolution.item);
    } else {
      errors.push({
        query,
        error: resolution.status === "ambiguous" ? "Ambiguous benchmark" : "Benchmark not found",
        candidates: resolution.candidates.map((benchmark) => ({ name: benchmark.name, key: benchmark.key })),
      });
    }
  }

  return errors.length > 0 ? { errors } : { benchmarks };
}
