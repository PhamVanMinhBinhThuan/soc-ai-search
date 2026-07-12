import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  LoaderCircle,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { AnalyticsView } from "@/features/search/components/results/analytics-view";
import { RawEventsView } from "@/features/search/components/results/raw-events-view";
import { ResultControls } from "@/features/search/components/results/result-controls";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import type {
  AggregationResultItemDto,
  ChartMetadataDto,
  ExportStatus,
  SearchEventDto,
  SearchMode,
  NaturalLanguageSearchResponseDto,
  SearchPlanDto,
} from "@/shared/types/soc";

type ResultTab = "analytics" | "raw";

export function ResultTabs({
  mode,
  activeTab,
  events,
  aggregationResults,
  chartMetadata,
  total,
  page,
  size,
  totalPages,
  isMockMode,
  queryId,
  exportStatus,
  exportMessage,
  canExportCsv,
  exportDisabled,
  response,
  onTabChange,
  onPageChange,
  onSelectEvent,
  onExport,
  onApplyResultPlan,
}: {
  mode: SearchMode;
  activeTab: ResultTab;
  events: SearchEventDto[];
  aggregationResults: AggregationResultItemDto[];
  chartMetadata: ChartMetadataDto | null;
  total: number;
  page: number;
  size: number;
  totalPages: number;
  isMockMode: boolean;
  queryId: string | null;
  exportStatus: ExportStatus;
  exportMessage: string | null;
  canExportCsv: boolean;
  exportDisabled: boolean;
  response: NaturalLanguageSearchResponseDto | null;
  onTabChange: (tab: ResultTab) => void;
  onPageChange: (page: number) => void;
  onSelectEvent: (eventId: string) => void;
  onExport: () => void;
  onApplyResultPlan?: (plan: SearchPlanDto) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const ToggleIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden border border-cyan-400/25 bg-[#091018]/90 py-0 shadow-[0_0_36px_-24px_#22d3ee]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-400/15 bg-cyan-400/[0.04] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
              <Table2 className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-slate-50">Query Result</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-100"
              aria-expanded={expanded}
              aria-controls="query-result-content"
              aria-label={
                expanded ? "Collapse query result" : "Expand query result"
              }
              onClick={() => setExpanded((current) => !current)}
            >
              <ToggleIcon className="size-4" />
            </Button>
          </div>
        </div>

        {expanded ? (
          <div id="query-result-content">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-slate-400">
                  Mode: <strong className="text-foreground">{mode}</strong>
                </span>
                {mode !== "aggregation" ? (
                  <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-slate-400">
                    Total Events:{" "}
                    <strong className="text-foreground">
                      {total.toLocaleString("en-US")}
                    </strong>
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportDisabled}
                  onClick={onExport}
                  aria-label={
                    !canExportCsv
                      ? "CSV export requires analyst role"
                      : isMockMode
                        ? "Export mock results as CSV"
                        : "Export results as CSV"
                  }
                  aria-live="polite"
                  title={
                    !canExportCsv
                      ? "Requires SOC_ANALYST or SOC_ADMIN role"
                      : queryId
                        ? `Export query ${queryId}`
                        : "No query available"
                  }
                  className="border-cyan-300/35 bg-zinc-950/70 text-cyan-100 hover:bg-cyan-400/10"
                >
                  {exportStatus === "loading" ? (
                    <LoaderCircle className="animate-spin" />
                  ) : exportStatus === "success" ? (
                    <Check className="text-emerald-300" />
                  ) : (
                    <Download />
                  )}
                  {exportStatus === "loading"
                    ? "Exporting..."
                    : exportStatus === "success"
                      ? "Exported"
                      : !canExportCsv
                        ? "Export Locked"
                        : isMockMode
                          ? "Export Mock CSV"
                          : "Export CSV"}
                </Button>
              </div>
            </div>

            {exportMessage ? (
              <div className="px-4 pt-3" aria-live="polite">
                <Alert
                  className={
                    exportStatus === "error"
                      ? "border-rose-400/30 bg-rose-500/5"
                      : "border-emerald-400/25 bg-emerald-500/5"
                  }
                >
                  {exportStatus === "error" ? (
                    <TriangleAlert className="mr-2 inline size-4 text-rose-300" />
                  ) : (
                    <Check className="mr-2 inline size-4 text-emerald-300" />
                  )}
                  <AlertTitle className="inline">
                    {exportStatus === "error"
                      ? "CSV export failed"
                      : "CSV export ready"}
                  </AlertTitle>
                  <AlertDescription>{exportMessage}</AlertDescription>
                </Alert>
              </div>
            ) : null}

            {response ? (
              <ResultControls
                key={JSON.stringify(response.search_plan)}
                mode={mode}
                searchPlan={response.search_plan}
                onApply={onApplyResultPlan}
              />
            ) : null}

            <Tabs
              value={activeTab}
              onValueChange={(value) => onTabChange(value as ResultTab)}
              className="p-3 sm:p-4"
            >
              {mode === "aggregation" ? (
                <TabsList className="max-w-full overflow-x-auto">
                  <TabsTrigger value="analytics">
                    <BarChart3 />
                    Analytics View
                  </TabsTrigger>
                </TabsList>
              ) : null}

              <TabsContent value="analytics">
                <AnalyticsView
                  aggregationResults={aggregationResults}
                  chartMetadata={chartMetadata}
                  aggregationField={response?.search_plan.aggregation?.field ?? null}
                  aggregationType={response?.search_plan.aggregation?.type ?? null}
                />
              </TabsContent>
              <TabsContent value="raw">
                <RawEventsView
                  events={events}
                  total={total}
                  page={page}
                  size={size}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                  onSelectEvent={onSelectEvent}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export type { ResultTab };
