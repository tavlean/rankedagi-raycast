import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useDataset } from "./lib/data";
import { formatCost, formatScore } from "./lib/format";
import { sortModelsByKey } from "./lib/ranking";
import { BenchmarkDef, ModelRow } from "./lib/types";

const SITE_ROOT = "https://rankedagi.com";

export default function SearchModels() {
  const { data, isLoading, composites, realBenchmarks, benchmarksByKey, revalidate } = useDataset();
  const initialSortKey = data?.defaultSortKey ?? "ragi";
  const [sortKey, setSortKey] = useState<string>();
  const selectedSortKey = sortKey && benchmarksByKey.has(sortKey) ? sortKey : initialSortKey;
  const selectedComposite = benchmarksByKey.get(selectedSortKey) ?? composites[0];

  const models = useMemo(() => {
    if (!data || !selectedComposite) {
      return [];
    }

    return sortModelsByKey(data.models, selectedComposite.key, selectedComposite);
  }, [data, selectedComposite]);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search AI models…"
      searchBarAccessory={
        <List.Dropdown tooltip="Rank By" value={selectedSortKey} onChange={setSortKey}>
          {composites.map((composite) => (
            <List.Dropdown.Item key={composite.key} title={composite.name} value={composite.key} />
          ))}
        </List.Dropdown>
      }
    >
      {data &&
        models.map((row, index) => (
          <List.Item
            key={row.Slug}
            title={row.Model}
            subtitle={row.Org}
            keywords={modelKeywords(row)}
            accessories={[
              { text: `#${index + 1}` },
              { text: selectedComposite ? formatScore(row[selectedComposite.key], selectedComposite) : "—" },
            ]}
            detail={<ModelDetail row={row} composites={composites} realBenchmarks={realBenchmarks} />}
            actions={<ModelActions row={row} onRefresh={revalidate} />}
          />
        ))}
    </List>
  );
}

function ModelDetail({
  row,
  composites,
  realBenchmarks,
}: {
  row: ModelRow;
  composites: BenchmarkDef[];
  realBenchmarks: BenchmarkDef[];
}) {
  return (
    <List.Item.Detail
      markdown={modelMarkdown(row, composites, realBenchmarks)}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Org" text={row.Org ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Version" text={row.Version ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Released" text={row.Released ?? "—"} />
          <List.Item.Detail.Metadata.Label title="License" text={row.License ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Cost" text={formatCost(row.InCost, row.OutCost)} />
          {row.links?.map((link) => (
            <List.Item.Detail.Metadata.Link
              key={link.url}
              title={link.title ?? "Link"}
              target={link.url}
              text={linkHost(link.url)}
            />
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function ModelActions({ row, onRefresh }: { row: ModelRow; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open on RankedAGI" url={`${SITE_ROOT}/models/${row.__familySlug ?? row.Slug}`} />
      <Action.CopyToClipboard title="Copy Model Name" content={row.Model} />
      <Action.CopyToClipboard title="Copy Slug" content={row.Slug} />
      <Action title="Refresh Data" onAction={onRefresh} />
    </ActionPanel>
  );
}

function modelMarkdown(row: ModelRow, composites: BenchmarkDef[], realBenchmarks: BenchmarkDef[]) {
  const title = row.__levelLabel ? `${row.Model} · ${row.__levelLabel}` : row.Model;
  const visibleScores = realBenchmarks.filter((benchmark) => hasScore(row, benchmark.key));
  const sections = [
    `## ${escapeMarkdown(title)}`,
    "### Composites",
    table(
      ["Composite", "Score"],
      composites.map((benchmark) => [benchmark.name, formatScore(row[benchmark.key], benchmark)]),
    ),
  ];

  if (visibleScores.length > 0) {
    sections.push(
      "### Benchmark Scores",
      table(
        ["Benchmark", "Score"],
        visibleScores.map((benchmark) => [benchmark.name, formatScore(row[benchmark.key], benchmark)]),
      ),
    );
  }

  if (row.levels && row.levels.length > 0) {
    sections.push("### Reasoning Levels", reasoningLevelsTable(row, composites, realBenchmarks));
  }

  return sections.join("\n\n");
}

function reasoningLevelsTable(row: ModelRow, composites: BenchmarkDef[], realBenchmarks: BenchmarkDef[]) {
  const levels = row.levels ?? [];
  const ragiOverall = composites.find((composite) => composite.key === "ragi");
  const scoredBenchmarks = realBenchmarks
    .filter((benchmark) => levels.some((level) => hasScore(level, benchmark.key)))
    .slice(0, 5);
  const columns = [ragiOverall, ...scoredBenchmarks].filter(Boolean) as BenchmarkDef[];

  return table(
    ["Level", ...columns.map((benchmark) => benchmark.name)],
    levels.map((level) => [
      level.effortLabel ?? "base",
      ...columns.map((benchmark) => formatScore(level[benchmark.key], benchmark)),
    ]),
  );
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.map(escapeMarkdown).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdown).join(" | ")} |`),
  ].join("\n");
}

function modelKeywords(row: ModelRow) {
  return [row.Slug, row.Org, row.family, row.effortLabel, row.__levelLabel].filter(Boolean) as string[];
}

function hasScore(row: ModelRow, key: string) {
  return typeof row[key] === "number" && !Number.isNaN(row[key]);
}

function linkHost(link: string) {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

function escapeMarkdown(value: string) {
  return value.replace(/\|/g, "\\|");
}
