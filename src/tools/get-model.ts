import { deriveDatasetCollections } from "../lib/collections";
import { SITE_ROOT } from "../lib/constants";
import { loadDataset } from "../lib/dataset";
import { formatCost, formatScore } from "../lib/format";
import { listModelCandidates, resolveModel } from "../lib/resolve";
import { BenchmarkDef, Dataset, ModelRow } from "../lib/types";

type Input = {
  /**
   * Model name or slug to look up. Exact slug wins; fuzzy name matching is supported.
   */
  model: string;
};

/**
 * Get compact RankedAGI facts, composite scores, benchmark scores, reasoning levels, pricing, and links for one model.
 */
export default async function tool(input: Input) {
  const dataset = await loadDataset();
  const resolution = resolveModel(dataset, input.model);

  if (resolution.status !== "found") {
    const candidates =
      resolution.candidates.length > 0 ? resolution.candidates : listModelCandidates(dataset, input.model, 3);

    if (resolution.status === "ambiguous") {
      return `Ambiguous model. Top candidates: ${candidates.map((model) => model.Model).join(", ")}`;
    }

    return candidates.length > 0
      ? `Model not found. Closest candidates: ${candidates.map((model) => model.Model).join(", ")}`
      : "Model not found.";
  }

  return modelReport(dataset, resolution.item);
}

function modelReport(dataset: Dataset, model: ModelRow) {
  const { composites, realBenchmarks } = deriveDatasetCollections(dataset);
  const sections = [
    `${model.Model} (${model.Slug})`,
    `Org: ${model.Org ?? "—"}`,
    `Version: ${model.Version ?? "—"}`,
    `Released: ${model.Released ?? "—"}`,
    `License: ${model.License ?? "—"}`,
    `Pricing: ${formatCost(model.InCost, model.OutCost)}`,
    `Context: ${formatOptional(model.Context)}`,
    `RankedAGI: ${SITE_ROOT}/models/${model.__familySlug ?? model.Slug}`,
    "",
    `Composites: ${formatScores(model, composites)}`,
    `Benchmarks: ${formatScores(
      model,
      realBenchmarks.filter((benchmark) => hasScore(model, benchmark.key)),
    )}`,
  ];

  if (model.levels && model.levels.length > 0) {
    const ragiOverall = composites.find((benchmark) => benchmark.key === "ragi");

    if (ragiOverall) {
      sections.push(
        `Reasoning levels: ${model.levels
          .map(
            (level) =>
              `${level.effortLabel ?? level.__levelLabel ?? "base"} ${formatScore(level[ragiOverall.key], ragiOverall)}`,
          )
          .join("; ")}`,
      );
    }
  }

  return sections.join("\n");
}

function formatScores(model: ModelRow, benchmarks: BenchmarkDef[]) {
  if (benchmarks.length === 0) {
    return "—";
  }

  return benchmarks.map((benchmark) => `${benchmark.name}: ${formatScore(model[benchmark.key], benchmark)}`).join("; ");
}

function hasScore(row: ModelRow, key: string) {
  return typeof row[key] === "number" && !Number.isNaN(row[key]);
}

function formatOptional(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? `${value}` : "—";
}
