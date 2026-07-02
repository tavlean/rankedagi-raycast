export type ScoreFormat = "percent" | "integer" | "currency";

export type BenchmarkDef = {
  key: string;
  name: string;
  shortName?: string;
  subtitle?: string;
  category?: string;
  description?: string;
  format: ScoreFormat;
  ascending?: boolean;
  sortOrder?: number;
  displayMode?: string;
  website?: string;
  hidden?: boolean;
  managedByRagi?: boolean;
  archived?: boolean;
  [key: string]: unknown;
};

export type ModelLink = {
  title?: string;
  url: string;
};

export type ModelRow = {
  Slug: string;
  Model: string;
  Version?: string;
  Org?: string;
  License?: string;
  Released?: string;
  InCost?: number | null;
  OutCost?: number | null;
  links?: ModelLink[];
  last_updated?: string;
  family?: string;
  variantKind?: string;
  reasoningEffort?: number | string;
  effortLabel?: string;
  __familySlug?: string;
  __levelLabel?: string;
  levels?: ModelRow[];
  [key: string]: unknown;
};

export type Dataset = {
  version: 1;
  generatedAt: string;
  defaultSortKey: string;
  benchmarks: BenchmarkDef[];
  models: ModelRow[];
  [key: string]: unknown;
};
