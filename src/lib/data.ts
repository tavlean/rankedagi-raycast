import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { BenchmarkDef, Dataset } from "./types";

const COMPOSITE_KEYS = ["ragi", "ragi_code", "ragi_agentic", "ragi_reasoning", "ragi_math"] as const;

type Preferences = {
  dataUrl?: string;
};

export function useDataset() {
  const preferences = getPreferenceValues<Preferences>();
  const dataUrl = preferences.dataUrl || "https://rankedagi.com/api/export";
  const fetchState = useFetch<Dataset>(dataUrl, {
    keepPreviousData: true,
    failureToastOptions: {
      title: "Could not refresh RankedAGI data",
    },
  });

  return useMemo(() => {
    const benchmarks = fetchState.data?.benchmarks ?? [];
    const benchmarksByKey = new Map<string, BenchmarkDef>(benchmarks.map((benchmark) => [benchmark.key, benchmark]));
    const realBenchmarks = benchmarks
      .filter(
        (benchmark) => benchmark.managedByRagi !== true && benchmark.hidden !== true && benchmark.archived !== true,
      )
      .sort(compareBenchmarks);
    const composites = COMPOSITE_KEYS.map((key) => benchmarksByKey.get(key)).filter(Boolean) as BenchmarkDef[];

    return {
      ...fetchState,
      benchmarksByKey,
      realBenchmarks,
      composites,
    };
  }, [fetchState]);
}

function compareBenchmarks(a: BenchmarkDef, b: BenchmarkDef) {
  return (
    (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name)
  );
}
