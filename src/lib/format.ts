import { BenchmarkDef } from "./types";

export function formatScore(value: unknown, def: BenchmarkDef): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  if (def.format === "percent") {
    return `${(value * 100).toFixed(1)}%`;
  }

  if (def.format === "integer") {
    return `${Math.round(value)}`;
  }

  if (def.format === "currency") {
    return `$${value}`;
  }

  return `${value}`;
}

export function formatCost(inCost: unknown, outCost: unknown): string {
  const input = typeof inCost === "number" && !Number.isNaN(inCost) ? `$${inCost} in` : undefined;
  const output = typeof outCost === "number" && !Number.isNaN(outCost) ? `$${outCost} out` : undefined;
  const costs = [input, output].filter(Boolean);

  return costs.length > 0 ? `${costs.join(" / ")} · per M tokens` : "—";
}
