import { Action, ActionPanel, List } from "@raycast/api";
import { useMemo } from "react";
import { useDataset } from "./lib/data";
import { formatScore } from "./lib/format";
import { rankModelsForBenchmark } from "./lib/ranking";
import { BenchmarkDef, ModelRow } from "./lib/types";

const SITE_ROOT = "https://rankedagi.com";

export default function SearchBenchmarks() {
  const { data, isLoading, composites, realBenchmarks, revalidate } = useDataset();
  const benchmarksByCategory = useMemo(() => groupBenchmarksByCategory(realBenchmarks), [realBenchmarks]);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search benchmarks…">
      {data && (
        <>
          <List.Section title="RAGI Composites">
            {composites.map((benchmark) => (
              <BenchmarkItem key={benchmark.key} benchmark={benchmark} models={data.models} onRefresh={revalidate} />
            ))}
          </List.Section>
          {benchmarksByCategory.map(([category, benchmarks]) => (
            <List.Section key={category} title={category}>
              {benchmarks.map((benchmark) => (
                <BenchmarkItem key={benchmark.key} benchmark={benchmark} models={data.models} onRefresh={revalidate} />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function BenchmarkItem({
  benchmark,
  models,
  onRefresh,
}: {
  benchmark: BenchmarkDef;
  models: ModelRow[];
  onRefresh: () => void;
}) {
  return (
    <List.Item
      title={benchmark.name}
      keywords={[benchmark.key, benchmark.shortName, benchmark.category].filter(Boolean) as string[]}
      accessories={[{ tag: benchmark.format }]}
      detail={
        <List.Item.Detail
          markdown={benchmarkMarkdown(benchmark, models)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Category" text={benchmark.category ?? "—"} />
              <List.Item.Detail.Metadata.Label title="Format" text={benchmark.format} />
              <List.Item.Detail.Metadata.Label
                title="Direction"
                text={benchmark.ascending === true ? "Lower is better" : "Higher is better"}
              />
              {benchmark.website && (
                <List.Item.Detail.Metadata.Link
                  title="Website"
                  target={benchmark.website}
                  text={linkHost(benchmark.website)}
                />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<BenchmarkActions benchmark={benchmark} onRefresh={onRefresh} />}
    />
  );
}

function BenchmarkActions({ benchmark, onRefresh }: { benchmark: BenchmarkDef; onRefresh: () => void }) {
  return (
    <ActionPanel>
      {benchmark.website && <Action.OpenInBrowser title="Open Benchmark Website" url={benchmark.website} />}
      <Action.OpenInBrowser title="Open RankedAGI" url={SITE_ROOT} />
      <Action.CopyToClipboard title="Copy Benchmark Key" content={benchmark.key} />
      <Action title="Refresh Data" onAction={onRefresh} />
    </ActionPanel>
  );
}

function benchmarkMarkdown(benchmark: BenchmarkDef, models: ModelRow[]) {
  const ranking = rankModelsForBenchmark(models, benchmark).slice(0, 20);
  const sections = [];

  if (benchmark.description) {
    sections.push(escapeMarkdown(benchmark.description));
  }

  sections.push(
    "### Top Models",
    table(
      ["Rank", "Model", "Score"],
      ranking.map((entry) => [`#${entry.rank}`, entry.row.Model, formatScore(entry.value, benchmark)]),
    ),
  );

  return sections.join("\n\n");
}

function groupBenchmarksByCategory(benchmarks: BenchmarkDef[]) {
  const groups = new Map<string, BenchmarkDef[]>();

  for (const benchmark of benchmarks) {
    const category = benchmark.category ?? "Other";
    groups.set(category, [...(groups.get(category) ?? []), benchmark]);
  }

  return [...groups.entries()];
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.map(escapeMarkdown).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeMarkdown).join(" | ")} |`),
  ].join("\n");
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
