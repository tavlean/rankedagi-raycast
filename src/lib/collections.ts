import { BenchmarkDef, Dataset } from "./types";
import { COMPOSITE_KEYS } from "./constants";

export type DatasetCollections = {
  benchmarksByKey: Map<string, BenchmarkDef>;
  realBenchmarks: BenchmarkDef[];
  composites: BenchmarkDef[];
};

export function deriveDatasetCollections(dataset?: Dataset): DatasetCollections {
  const benchmarks = dataset?.benchmarks ?? [];
  const benchmarksByKey = new Map<string, BenchmarkDef>(benchmarks.map((benchmark) => [benchmark.key, benchmark]));
  const realBenchmarks = benchmarks
    .filter((benchmark) => benchmark.managedByRagi !== true && benchmark.hidden !== true && benchmark.archived !== true)
    .sort(compareBenchmarks);
  const composites = COMPOSITE_KEYS.map((key) => benchmarksByKey.get(key)).filter(Boolean) as BenchmarkDef[];

  return {
    benchmarksByKey,
    realBenchmarks,
    composites,
  };
}

function compareBenchmarks(a: BenchmarkDef, b: BenchmarkDef) {
  return (
    (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)
  );
}
