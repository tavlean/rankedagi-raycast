import { BenchmarkDef, Dataset, ModelRow } from "./types";

export type Resolution<T> =
  | {
      status: "found";
      item: T;
      candidates: T[];
    }
  | {
      status: "ambiguous";
      candidates: T[];
    }
  | {
      status: "not-found";
      candidates: T[];
    };

export function resolveModel(dataset: Dataset, query: string): Resolution<ModelRow> {
  return resolveOne(dataset.models, query, modelFields, (model) => model.Slug);
}

export function resolveBenchmark(benchmarks: BenchmarkDef[], query: string): Resolution<BenchmarkDef> {
  return resolveOne(benchmarks, query, benchmarkFields, (benchmark) => benchmark.key);
}

export function listModelCandidates(dataset: Dataset, query: string, limit = 3): ModelRow[] {
  return resolveCandidates(dataset.models, query, modelFields, (model) => model.Slug).slice(0, limit);
}

export function listBenchmarkCandidates(benchmarks: BenchmarkDef[], query: string, limit = 3): BenchmarkDef[] {
  return resolveCandidates(benchmarks, query, benchmarkFields, (benchmark) => benchmark.key).slice(0, limit);
}

function resolveOne<T>(
  items: T[],
  query: string,
  getFields: (item: T) => string[],
  getExactKey: (item: T) => string,
): Resolution<T> {
  const candidates = resolveCandidates(items, query, getFields, getExactKey);

  if (candidates.length === 0) {
    return { status: "not-found", candidates: [] };
  }

  const normalizedQuery = normalize(query);
  const exactKey = candidates.find((item) => normalize(getExactKey(item)) === normalizedQuery);

  if (exactKey) {
    return { status: "found", item: exactKey, candidates };
  }

  const exactNames = candidates.filter((item) => getFields(item).some((field) => normalize(field) === normalizedQuery));

  if (exactNames.length === 1) {
    return { status: "found", item: exactNames[0], candidates };
  }

  if (exactNames.length > 1) {
    return { status: "ambiguous", candidates: exactNames.slice(0, 3) };
  }

  const topScore = candidateScore(candidates[0], normalizedQuery, getFields, getExactKey);
  const tied = candidates.filter((item) => candidateScore(item, normalizedQuery, getFields, getExactKey) === topScore);

  if (tied.length > 1) {
    return { status: "ambiguous", candidates: tied.slice(0, 3) };
  }

  return { status: "found", item: candidates[0], candidates };
}

function resolveCandidates<T>(
  items: T[],
  query: string,
  getFields: (item: T) => string[],
  getExactKey: (item: T) => string,
) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  return items
    .map((item, index) => ({
      item,
      index,
      score: candidateScore(item, normalizedQuery, getFields, getExactKey),
    }))
    .filter((candidate) => candidate.score < Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((candidate) => candidate.item);
}

function candidateScore<T>(
  item: T,
  normalizedQuery: string,
  getFields: (item: T) => string[],
  getExactKey: (item: T) => string,
) {
  if (normalize(getExactKey(item)) === normalizedQuery) {
    return 0;
  }

  const fields = getFields(item).map(normalize).filter(Boolean);

  if (fields.some((field) => field === normalizedQuery)) {
    return 1;
  }

  if (fields.some((field) => field.includes(normalizedQuery))) {
    return 2;
  }

  if (fields.some((field) => field.split(/\s+/).some((word) => word.startsWith(normalizedQuery)))) {
    return 3;
  }

  return Number.MAX_SAFE_INTEGER;
}

function modelFields(model: ModelRow) {
  return [model.Model, model.Slug, model.Org, model.family].filter(Boolean) as string[];
}

function benchmarkFields(benchmark: BenchmarkDef) {
  return [benchmark.name, benchmark.shortName, benchmark.key].filter(Boolean) as string[];
}

function normalize(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}
