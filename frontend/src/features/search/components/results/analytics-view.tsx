import { BarChart3, ChevronLeft, ChevronRight, Table2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatLocalChartTooltipLabel } from "@/shared/lib/chart-time-format";
import { SUMMARY_TABLE_PAGE_SIZE } from "@/features/search/lib/search-plan-constants";
import type {
  AggregationResultItemDto,
  AggregationType,
  ChartMetadataDto,
} from "@/shared/types/soc";
import { EmptyModeState } from "./empty-mode-state";

const AggregationChart = lazy(() =>
  import("@/features/search/components/aggregation-chart").then((module) => ({
    default: module.AggregationChart,
  })),
);

export function AnalyticsView({
  aggregationResults,
  chartMetadata,
  aggregationField,
  aggregationType,
}: {
  aggregationResults: AggregationResultItemDto[];
  chartMetadata: ChartMetadataDto | null;
  aggregationField?: string | null;
  aggregationType?: AggregationType | null;
}) {
  const [summaryPage, setSummaryPage] = useState(0);

  if (aggregationResults.length === 0) {
    return (
      <EmptyModeState
        icon={BarChart3}
        title="No aggregation buckets"
        description="The aggregation completed without returning any matching buckets."
      />
    );
  }

  const totalSummaryPages = Math.ceil(
    aggregationResults.length / SUMMARY_TABLE_PAGE_SIZE,
  );
  const currentSummaryPage = Math.min(
    summaryPage,
    Math.max(totalSummaryPages - 1, 0),
  );
  const firstSummaryIndex = currentSummaryPage * SUMMARY_TABLE_PAGE_SIZE;
  const visibleAggregationResults = aggregationResults.slice(
    firstSummaryIndex,
    firstSummaryIndex + SUMMARY_TABLE_PAGE_SIZE,
  );
  const firstSummaryRow = firstSummaryIndex + 1;
  const lastSummaryRow = firstSummaryIndex + visibleAggregationResults.length;
  const formatSummaryKey = (key: string) =>
    chartMetadata?.chart_type === "LINE"
      ? formatLocalChartTooltipLabel(key)
      : key;

  return (
    <div className="space-y-4">
      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-xl border border-border bg-secondary/20" />
        }
      >
        <AggregationChart
          data={aggregationResults}
          metadata={chartMetadata ?? undefined}
          aggregationField={aggregationField}
          aggregationType={aggregationType}
        />
      </Suspense>

      <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#071018]/85 shadow-[0_0_24px_-22px_#22d3ee]">
        <div className="flex items-center gap-2 border-b border-cyan-400/15 bg-cyan-400/[0.055] px-4 py-3">
          <Table2 className="size-4 text-cyan-200" />
          <h3 className="text-sm font-semibold text-slate-50">Summary Table</h3>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {aggregationResults.length} buckets
          </span>
        </div>
        <Table>
          <TableHeader className="bg-cyan-950/20">
            <TableRow className="border-cyan-400/15 hover:bg-transparent">
              <TableHead>{chartMetadata?.x_axis_label ?? "Key"}</TableHead>
              <TableHead className="text-right">
                {chartMetadata?.y_axis_label ?? "Value"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAggregationResults.map((item) => (
              <TableRow
                key={item.key}
                className="border-cyan-400/10 transition-colors hover:bg-cyan-400/[0.045]"
              >
                <TableCell className="font-mono text-xs">
                  {formatSummaryKey(item.key)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-cyan-300">
                  {item.value.toLocaleString("en-US")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalSummaryPages > 1 ? (
          <div className="flex items-center justify-between border-t border-cyan-400/15 bg-zinc-950/55 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-mono text-foreground">
                {firstSummaryRow}
              </span>
              {" - "}
              <span className="font-mono text-foreground">
                {lastSummaryRow}
              </span>
              {" of "}
              <span className="font-mono text-foreground">
                {aggregationResults.length.toLocaleString("en-US")}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                Page {currentSummaryPage + 1} of {totalSummaryPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous summary page"
                disabled={currentSummaryPage <= 0}
                onClick={() => setSummaryPage(currentSummaryPage - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next summary page"
                disabled={currentSummaryPage + 1 >= totalSummaryPages}
                onClick={() => setSummaryPage(currentSummaryPage + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
