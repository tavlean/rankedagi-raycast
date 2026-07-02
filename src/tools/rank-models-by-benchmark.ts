import { deriveDatasetCollections } from "../lib/collections";
import { loadDataset } from "../lib/dataset";
import { formatScore } from "../lib/format";
import { rankModelsForBenchmark } from "../lib/ranking";
import { listBenchmarkCandidates, resolveBenchmark } from "../lib/resolve";

type Input = {
  /**
   * Benchmark key, name, or short name, such as ragi_code, SWE-Bench Pro, MMLU, GPQA, or MathArena.
   */
  benchmark: string;
  /**
   * Maximum number of ranked models to return. Defaults to 10 and is capped at 25.
   */
  limit?: number;
};

/**
 * Rank RankedAGI models by a requested benchmark or RAGI composite score.
 */
export default async function tool(input: Input) {
  const dataset = await loadDataset();
  const { benchmarksByKey } = deriveDatasetCollections(dataset);
  const benchmarks = dataset.benchmarks.filter((benchmark) => benchmark.archived !== true);
  const resolution = resolveBenchmark(benchmarks, input.benchmark);

  if (resolution.status !== "found") {
    const candidates =
      resolution.candidates.length > 0
        ? resolution.candidates
        : listBenchmarkCandidates(benchmarks, input.benchmark, 3);

    return {
      error: resolution.status === "ambiguous" ? "Ambiguous benchmark" : "Benchmark not found",
      candidates: candidates.map((benchmark) => ({ name: benchmark.name, key: benchmark.key })),
    };
  }

  const benchmark = benchmarksByKey.get(resolution.item.key) ?? resolution.item;
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);

  return {
    benchmark: {
      name: benchmark.name,
      key: benchmark.key,
    },
    ranking: rankModelsForBenchmark(dataset.models, benchmark)
      .slice(0, limit)
      .map((entry) => ({
        rank: entry.rank,
        model: entry.row.Model,
        org: entry.row.Org ?? "—",
        score: formatScore(entry.value, benchmark),
      })),
  };
}
