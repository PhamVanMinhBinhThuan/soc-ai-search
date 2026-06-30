import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileSearch,
  Lightbulb,
  LoaderCircle,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";

import { CountryCode } from "@/components/soc/country-code";
import { SeverityBadge } from "@/components/soc/severity-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AggregationResultItemDto,
  ChartMetadataDto,
  ExportStatus,
  SearchEventDto,
  SearchMode,
  NaturalLanguageSearchResponseDto,
  SearchPlanDto,
  SearchSortField,
  Severity,
  SortOrder,
} from "@/types/soc";
import { getSuggestions } from "@/lib/investigation-suggestions";

type ResultTab = "analytics" | "raw";
const SUMMARY_TABLE_PAGE_SIZE = 10;
const SEVERITY_OPTIONS: Severity[] = ["critical", "high", "medium", "low"];
const EVENT_TYPE_OPTIONS = [
  "failed_login",
  "account_lockout",
  "firewall_block",
  "malware_detected",
  "privilege_escalation",
  "suspicious_outbound",
  "large_transfer",
  "successful_login",
  "dns_query",
  "process_start",
  "file_access",
];
const SEARCH_SORT_OPTIONS: {
  label: string;
  field: SearchSortField;
  order: SortOrder;
}[] = [
  { label: "Newest first", field: "timestamp", order: "desc" },
  { label: "Oldest first", field: "timestamp", order: "asc" },
  { label: "Highest severity first", field: "severity", order: "desc" },
  { label: "Lowest severity first", field: "severity", order: "asc" },
];
const AGGREGATION_TOP_N_OPTIONS = [5, 10, 20, 50];

const AggregationChart = lazy(() =>
  import("@/components/soc/aggregation-chart").then((module) => ({
    default: module.AggregationChart,
  })),
);

function EmptyModeState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BarChart3;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-background/25 p-8 text-center">
      <div>
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function AnalyticsView({
  aggregationResults,
  chartMetadata,
}: {
  aggregationResults: AggregationResultItemDto[];
  chartMetadata: ChartMetadataDto | null;
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
        />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/25 px-4 py-3">
          <Table2 className="size-4 text-cyan-300" />
          <h3 className="text-sm font-semibold">Summary Table</h3>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {aggregationResults.length} buckets
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{chartMetadata?.x_axis_label ?? "Key"}</TableHead>
              <TableHead className="text-right">
                {chartMetadata?.y_axis_label ?? "Value"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAggregationResults.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="font-mono text-xs">{item.key}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-cyan-300">
                  {item.value.toLocaleString("en-US")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalSummaryPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
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

function RawEventsView({
  events,
  total,
  page,
  size,
  totalPages,
  onPageChange,
  onSelectEvent,
}: {
  events: SearchEventDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelectEvent: (eventId: string) => void;
}) {
  if (events.length === 0) {
    return (
      <EmptyModeState
        icon={FileSearch}
        title="No matching events"
        description="The search completed successfully, but no raw events matched the validated SearchPlan."
      />
    );
  }

  const firstResult = page * size + 1;
  const lastResult = Math.min(page * size + events.length, total);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/25 px-4 py-3">
        <Table2 className="size-4 text-cyan-300" />
        <h3 className="text-sm font-semibold">Raw Events</h3>
        <div className="flex-1" />
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <Lightbulb className="size-3.5 text-amber-300" />
          Tip: Click on any row to view full details
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="min-w-64">Message</TableHead>
            <TableHead className="w-8 px-2">
              <span className="sr-only">Action</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow
              key={event.event_id}
              tabIndex={0}
              aria-label={`Open event ${event.event_id}`}
              className="group cursor-pointer focus-visible:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50"
              onClick={() => onSelectEvent(event.event_id)}
              onKeyDown={(eventKey) => {
                if (eventKey.key === "Enter" || eventKey.key === " ") {
                  eventKey.preventDefault();
                  onSelectEvent(event.event_id);
                }
              }}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.timestamp?.replace("T", " ")?.replace("Z", "") || "N/A"}
              </TableCell>
              <TableCell>
                <SeverityBadge severity={event.severity} />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {event.source}
              </TableCell>
              <TableCell>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs">
                  {event.event_type}
                </span>
              </TableCell>
              <TableCell>{event.user}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.host}
              </TableCell>
              <TableCell className="font-mono text-xs">{event.ip}</TableCell>
              <TableCell>
                <CountryCode code={event.country_code} />
              </TableCell>
              <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                {event.message}
              </TableCell>
              <TableCell className="px-2">
                <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-mono text-foreground">{firstResult}</span>
          {" - "}
          <span className="font-mono text-foreground">{lastResult}</span>
          {" of "}
          <span className="font-mono text-foreground">
            {total.toLocaleString("en-US")}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous result page"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next result page"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function ResultControls({
  mode,
  searchPlan,
  onApply,
}: {
  mode: SearchMode;
  searchPlan: SearchPlanDto;
  onApply?: (plan: SearchPlanDto) => void;
}) {
  const currentFilters = searchPlan.filters ?? {};
  const currentSearchSort = searchPlan.sort?.[0];
  const initialSearchSortValue = currentSearchSort
    ? `${currentSearchSort.field}:${currentSearchSort.order}`
    : "timestamp:desc";
  const aggregation = searchPlan.aggregation;

  const [severity, setSeverity] = useState<Severity[]>(
    currentFilters.severity ?? [],
  );
  const [eventTypes, setEventTypes] = useState<string[]>(
    currentFilters.event_type ?? [],
  );
  const [user, setUser] = useState(currentFilters.user ?? "");
  const [host, setHost] = useState(currentFilters.host ?? "");
  const [ip, setIp] = useState(currentFilters.ip ?? "");
  const [countryCode, setCountryCode] = useState(
    currentFilters.country_code?.join(", ") ?? "",
  );
  const [messageQuery, setMessageQuery] = useState(
    searchPlan.message_query ?? "",
  );
  const [searchSort, setSearchSort] = useState(initialSearchSortValue);
  const [aggregationSort, setAggregationSort] = useState(
    `${aggregation?.order_by ?? "value"}:${aggregation?.order ?? "desc"}`,
  );
  const [topN, setTopN] = useState(
    aggregation?.top_n ?? (aggregation?.type === "top_n" ? 10 : 20),
  );

  if (!onApply) {
    return null;
  }

  const buildCommonFilters = () => ({
    ...(searchPlan.filters ?? {}),
    severity: severity.length > 0 ? severity : null,
    event_type: eventTypes.length > 0 ? eventTypes : null,
    user: user.trim() || null,
    host: host.trim() || null,
    ip: ip.trim() || null,
    country_code:
      countryCode
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean).length > 0
        ? countryCode
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean)
        : null,
  });

  const applySearchControls = () => {
    const [field, order] = searchSort.split(":") as [
      SearchSortField,
      SortOrder,
    ];

    onApply({
      ...searchPlan,
      mode: "search",
      page: 0,
      filters: buildCommonFilters(),
      message_query: messageQuery.trim() || null,
      sort: [{ field, order }],
    });
  };

  const applyAggregationControls = () => {
    if (!searchPlan.aggregation) {
      return;
    }

    const [orderBy, order] = aggregationSort.split(":") as [
      "value" | "key",
      SortOrder,
    ];
    const supportsBucketControls =
      searchPlan.aggregation.type === "group_by" ||
      searchPlan.aggregation.type === "top_n";

    onApply({
      ...searchPlan,
      page: 0,
      filters: buildCommonFilters(),
      aggregation: {
        ...searchPlan.aggregation,
        top_n: supportsBucketControls ? topN : searchPlan.aggregation.top_n,
        order_by: supportsBucketControls ? orderBy : null,
        order: supportsBucketControls ? order : null,
      },
      sort: null,
    });
  };

  return (
    <div className="space-y-3 border-b border-border bg-background/20 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Result Controls
        </span>
        <span className="text-xs text-muted-foreground">
          Filters are applied by rerunning a validated SearchPlan.
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setSeverity((current) => toggleArrayValue(current, option))
                }
                className={
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition " +
                  (severity.includes(option)
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    : "border-border bg-background/35 text-muted-foreground hover:text-foreground")
                }
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setEventTypes((current) => toggleArrayValue(current, option))
                }
                className={
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition " +
                  (eventTypes.includes(option)
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                    : "border-border bg-background/35 text-muted-foreground hover:text-foreground")
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={user}
            onChange={(event) => setUser(event.target.value)}
            placeholder="User"
            className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          />
          <input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder="Host"
            className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          />
          <input
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder="Source IP"
            className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          />
          <input
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            placeholder="Country code, e.g. CN"
            className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs outline-none focus:border-cyan-400/50"
          />
          {mode === "search" ? (
            <input
              value={messageQuery}
              onChange={(event) => setMessageQuery(event.target.value)}
              placeholder="Message contains"
              className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs outline-none focus:border-cyan-400/50 sm:col-span-2"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {mode === "search" ? (
            <select
              value={searchSort}
              onChange={(event) => setSearchSort(event.target.value)}
              className="rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
            >
              {SEARCH_SORT_OPTIONS.map((option) => (
                <option
                  key={`${option.field}:${option.order}`}
                  value={`${option.field}:${option.order}`}
                >
                  Sort: {option.label}
                </option>
              ))}
            </select>
          ) : null}
          {mode === "aggregation" &&
          (searchPlan.aggregation?.type === "group_by" ||
            searchPlan.aggregation?.type === "top_n") ? (
            <>
              <select
                value={aggregationSort}
                onChange={(event) => setAggregationSort(event.target.value)}
                className="rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
              >
                <option value="value:desc">Buckets: highest first</option>
                <option value="value:asc">Buckets: lowest first</option>
                <option value="key:asc">Buckets: key A-Z</option>
                <option value="key:desc">Buckets: key Z-A</option>
              </select>
              <select
                value={topN}
                onChange={(event) => setTopN(Number(event.target.value))}
                className="rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
              >
                {AGGREGATION_TOP_N_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Top {option}
                  </option>
                ))}
              </select>
            </>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSeverity([]);
              setEventTypes([]);
              setUser("");
              setHost("");
              setIp("");
              setCountryCode("");
              setMessageQuery("");
              setSearchSort("timestamp:desc");
              setAggregationSort("value:desc");
            }}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={
              mode === "search" ? applySearchControls : applyAggregationControls
            }
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  onSuggestionClick,
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
  onSuggestionClick?: (question: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const ToggleIcon = expanded ? ChevronUp : ChevronDown;
  const suggestions = useMemo(() => getSuggestions(response), [response]);

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden border border-border bg-card py-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Table2 className="size-4 text-cyan-300" />
            <h2 className="text-sm font-semibold">Query Result</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
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
                <span className="rounded-lg border border-border bg-background/35 px-3 py-1.5 text-xs text-muted-foreground">
                  Mode: <strong className="text-foreground">{mode}</strong>
                </span>
                {mode !== "aggregation" ? (
                  <span className="rounded-lg border border-border bg-background/35 px-3 py-1.5 text-xs text-muted-foreground">
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

      {suggestions.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-zinc-300 px-1">
            Suggested next steps
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.id}
                  onClick={() => onSuggestionClick?.(suggestion.question)}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left transition-all hover:border-cyan-500/30 hover:bg-zinc-800/60"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
                    <Icon className="size-4" />
                    {suggestion.category}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-cyan-50">
                      {suggestion.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                      {suggestion.question}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export type { ResultTab };
