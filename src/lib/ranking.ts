import { BenchmarkDef, ModelRow } from "./types";

export type RankedModel = {
  rank: number;
  row: ModelRow;
  value: number;
};

export function sortModelsByKey(models: ModelRow[], key: string, def?: BenchmarkDef): ModelRow[] {
  return [...models].sort((a, b) => compareRowsByKey(a, b, key, def));
}

export function rankModelsForBenchmark(models: ModelRow[], def: BenchmarkDef): RankedModel[] {
  return sortModelsByKey(models, def.key, def)
    .filter((row) => typeof row[def.key] === "number" && !Number.isNaN(row[def.key]))
    .map((row, index) => ({
      rank: index + 1,
      row,
      value: row[def.key] as number,
    }));
}

function compareRowsByKey(a: ModelRow, b: ModelRow, key: string, def?: BenchmarkDef): number {
  const aValue = a[key];
  const bValue = b[key];
  const aHasValue = typeof aValue === "number" && !Number.isNaN(aValue);
  const bHasValue = typeof bValue === "number" && !Number.isNaN(bValue);

  if (!aHasValue && !bHasValue) {
    return a.Model.localeCompare(b.Model);
  }

  if (!aHasValue) {
    return 1;
  }

  if (!bHasValue) {
    return -1;
  }

  return def?.ascending === true ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
}
