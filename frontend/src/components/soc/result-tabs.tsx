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
  SlidersHorizontal,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";

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
import { formatLocalChartTooltipLabel } from "@/lib/chart-time-format";
import type {
  AggregationResultItemDto,
  AggregationType,
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
        description="The search completed successfully, but no event logs matched the validated SearchPlan."
      />
    );
  }

  const firstResult = page * size + 1;
  const lastResult = Math.min(page * size + events.length, total);

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#071018]/85 shadow-[0_0_26px_-22px_#22d3ee]">
      <div className="flex items-center gap-2 border-b border-cyan-400/15 bg-cyan-400/[0.055] px-4 py-3">
        <Table2 className="size-4 text-cyan-200" />
        <h3 className="text-sm font-semibold text-slate-50">Event Logs</h3>
        <div className="flex-1" />
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <Lightbulb className="size-3.5 text-amber-300" />
          Tip: Click on any row to view full details
        </span>
      </div>
      <Table>
        <TableHeader className="bg-cyan-950/20">
          <TableRow className="border-cyan-400/15 hover:bg-transparent">
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
              className="group cursor-pointer border-cyan-400/10 transition-colors hover:bg-cyan-400/[0.045] focus-visible:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50"
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
                <span className="rounded-md border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100">
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
                <ChevronRight className="size-4 text-cyan-200 opacity-0 transition-opacity group-hover:opacity-100" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-cyan-400/15 bg-zinc-950/55 px-4 py-3">
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

function MultiSelectDropdown<T extends string>({
  label,
  placeholder,
  options,
  values,
  accentClassName,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: readonly T[];
  values: T[];
  accentClassName: string;
  onChange: (values: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? values[0]
        : `${values.length} selected`;

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-left text-sm text-foreground shadow-inner shadow-black/20 transition hover:border-cyan-300/45 focus:border-cyan-300/70 focus:outline-none"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={
            values.length === 0 ? "text-muted-foreground" : "text-foreground"
          }
        >
          {selectedLabel}
        </span>
        <ChevronDown
          className={
            "size-4 text-muted-foreground transition " +
            (open ? "rotate-180" : "")
          }
        />
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-cyan-400/25 bg-zinc-950 p-2 shadow-2xl shadow-cyan-950/30">
          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground">
              {values.length} selected
            </span>
            {values.length > 0 ? (
              <button
                type="button"
                className="text-[11px] font-medium text-cyan-300 hover:text-cyan-100"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="space-y-1">
            {options.map((option) => {
              const selected = values.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  className={
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition " +
                    (selected
                      ? `${accentClassName} text-foreground`
                      : "text-muted-foreground hover:bg-cyan-400/10 hover:text-foreground")
                  }
                  onClick={() => onChange(toggleArrayValue(values, option))}
                >
                  <span
                    className={
                      "grid size-4 place-items-center rounded border " +
                      (selected
                        ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                        : "border-zinc-700")
                    }
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="font-mono">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatEntityInput(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value ?? "";
}

function parseEntityInput(value: string) {
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? values : null;
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

  const [severity, setSeverity] = useState<Severity[]>(
    currentFilters.severity ?? [],
  );
  const [eventTypes, setEventTypes] = useState<string[]>(
    currentFilters.event_type ?? [],
  );
  const [source, setSource] = useState(formatEntityInput(currentFilters.source));
  const [user, setUser] = useState(formatEntityInput(currentFilters.user));
  const [host, setHost] = useState(formatEntityInput(currentFilters.host));
  const [ip, setIp] = useState(formatEntityInput(currentFilters.ip));
  const [countryCode, setCountryCode] = useState(
    currentFilters.country_code?.join(", ") ?? "",
  );
  const [messageQuery, setMessageQuery] = useState(
    searchPlan.message_query ?? "",
  );
  const [searchSort, setSearchSort] = useState(initialSearchSortValue);
  const [controlsExpanded, setControlsExpanded] = useState(false);

  if (!onApply || mode !== "search") {
    return null;
  }

  const buildCommonFilters = () => ({
    ...(searchPlan.filters ?? {}),
    severity: severity.length > 0 ? severity : null,
    event_type: eventTypes.length > 0 ? eventTypes : null,
    source: parseEntityInput(source),
    user: parseEntityInput(user),
    host: parseEntityInput(host),
    ip: parseEntityInput(ip),
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

  const ControlsToggleIcon = controlsExpanded ? ChevronUp : ChevronDown;

  return (
    <div className="border-b border-cyan-400/15 bg-cyan-950/[0.06] px-4 py-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-zinc-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_-22px_#22d3ee]">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
          aria-expanded={controlsExpanded}
          aria-controls="filter-sort-results-content"
          onClick={() => setControlsExpanded((current) => !current)}
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee]">
              <SlidersHorizontal className="size-4" />
            </span>
            <h3 className="text-sm font-semibold text-slate-50">
              Filter & Sort Results
            </h3>
          </div>
          <ControlsToggleIcon className="size-4 text-muted-foreground" />
        </button>

        {controlsExpanded ? (
          <div id="filter-sort-results-content" className="px-4 pb-4">
            <div className="grid gap-3 lg:grid-cols-3">
              <MultiSelectDropdown
                label="Severity"
                placeholder="Select severities"
                options={SEVERITY_OPTIONS}
                values={severity}
                accentClassName="bg-cyan-500/10"
                onChange={setSeverity}
              />
              <MultiSelectDropdown
                label="Event Type"
                placeholder="Select event types"
                options={EVENT_TYPE_OPTIONS}
                values={eventTypes}
                accentClassName="bg-violet-500/10"
                onChange={setEventTypes}
              />
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Sort
                </label>
                <select
                  value={searchSort}
                  onChange={(event) => setSearchSort(event.target.value)}
                  className="w-full rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-cyan-300/60"
                >
                  {SEARCH_SORT_OPTIONS.map((option) => (
                    <option
                      key={`${option.field}:${option.order}`}
                      value={`${option.field}:${option.order}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                placeholder="Source, e.g. vpn"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="User"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="Host"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                placeholder="Source IP"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                placeholder="Country code, e.g. CN"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60"
              />
              <input
                value={messageQuery}
                onChange={(event) => setMessageQuery(event.target.value)}
                placeholder="Message contains"
                className="rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-300/60 lg:col-span-2"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSeverity([]);
                  setEventTypes([]);
                  setSource("");
                  setUser("");
                  setHost("");
                  setIp("");
                  setCountryCode("");
                  setMessageQuery("");
                  setSearchSort("timestamp:desc");
                }}
              >
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={applySearchControls}
                className="border-cyan-300/35 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        ) : null}
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
