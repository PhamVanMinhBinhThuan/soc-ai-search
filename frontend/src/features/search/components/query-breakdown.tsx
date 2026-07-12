import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  Filter,
  Gauge,
  Globe2,
  Hash,
  LineChart,
  ListFilter,
  ListTree,
  MessageSquareText,
  Network,
  Search,
  Server,
  Table2,
  UserRound,
} from "lucide-react";

import { CountryCode } from "@/shared/components/display/country-code";
import { cn } from "@/shared/lib/utils";
import type {
  AggregationType,
  ChartMetadataDto,
  SearchPlanDto,
  SearchSortField,
} from "@/shared/types/soc";

type QueryBreakdownProps = {
  searchPlan: SearchPlanDto | null;
  chartMetadata?: ChartMetadataDto | null;
  className?: string;
};

type BreakdownRow = {
  field: string;
  value: ReactNode;
  keyValue: string;
  tone?: "default" | "time" | "severity" | "aggregation";
};

const FIELD_LABELS: Record<string, string> = {
  event_id: "Event ID",
  source: "Source",
  severity: "Severity",
  event_type: "Event type",
  user: "User",
  host: "Host",
  ip: "Source IP",
  country_code: "Country",
  message_query: "Message contains",
};

const AGGREGATION_LABELS: Record<AggregationType, string> = {
  count: "Count",
  group_by: "Group by",
  top_n: "Top N",
  date_histogram: "Time series",
};

const SORT_LABELS: Record<`${SearchSortField}:${"asc" | "desc"}`, string> = {
  "timestamp:desc": "Newest first",
  "timestamp:asc": "Oldest first",
  "severity:desc": "Highest severity first",
  "severity:asc": "Lowest severity first",
  "source:asc": "Source A-Z",
  "source:desc": "Source Z-A",
  "event_type:asc": "Event type A-Z",
  "event_type:desc": "Event type Z-A",
  "user:asc": "User A-Z",
  "user:desc": "User Z-A",
  "host:asc": "Host A-Z",
  "host:desc": "Host Z-A",
  "ip:asc": "Source IP ascending",
  "ip:desc": "Source IP descending",
  "country_code:asc": "Country A-Z",
  "country_code:desc": "Country Z-A",
};

function hasValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function joinValue(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value.filter((item) => item.trim() !== "").join(", ");
  }
  return value?.trim() ?? "";
}

function countryCodes(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.map((item) => item.trim().toUpperCase()).filter(Boolean);
}

function formatCountryValue(value: string | string[] | null | undefined) {
  const codes = countryCodes(value);

  return (
    <span className="flex flex-wrap gap-1.5">
      {codes.map((code) => (
        <CountryCode key={code} code={code} />
      ))}
    </span>
  );
}

function formatRelative(value: string) {
  if (value === "now") {
    return "now";
  }

  const match = /^now-(\d+)([hd])$/.exec(value);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2] === "h" ? "hour" : "day";
  return `last ${amount} ${unit}${amount === 1 ? "" : "s"}`;
}

function formatIso(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  const date = new Date(parsed);
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(date) + " UTC"
  );
}

function formatTimeEndpoint(value: string) {
  return formatRelative(value) ?? formatIso(value);
}

function formatTimeRange(from: string, to: string) {
  const fromRelative = formatRelative(from);
  if (fromRelative && to === "now") {
    return `${capitalize(fromRelative)} to now`;
  }
  return `${formatTimeEndpoint(from)} -> ${formatTimeEndpoint(to)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function fieldLabel(field: string | null | undefined) {
  if (!field) {
    return "";
  }
  return FIELD_LABELS[field] ?? field;
}

function visualizationFor(
  searchPlan: SearchPlanDto,
  chartMetadata?: ChartMetadataDto | null,
) {
  if (chartMetadata?.chart_type === "NUMBER") {
    return "Number";
  }
  if (chartMetadata?.chart_type === "BAR") {
    return "Bar chart";
  }
  if (chartMetadata?.chart_type === "LINE") {
    return "Line chart";
  }

  if (searchPlan.mode === "search") {
    return "Event logs table";
  }

  switch (searchPlan.aggregation?.type) {
    case "count":
      return "Number";
    case "group_by":
    case "top_n":
      return "Bar chart";
    case "date_histogram":
      return "Line chart";
    default:
      return "Aggregation result";
  }
}

function buildRows(searchPlan: SearchPlanDto, chartMetadata?: ChartMetadataDto | null) {
  const rows: BreakdownRow[] = [
    {
      field: "Mode",
      value: searchPlan.mode === "search" ? "Search" : "Aggregation",
      keyValue: searchPlan.mode,
      tone: "aggregation",
    },
  ];

  const filters = searchPlan.filters;
  if (filters?.timestamp?.from && filters.timestamp.to) {
    rows.push({
      field: "Time range",
      value: formatTimeRange(filters.timestamp.from, filters.timestamp.to),
      keyValue: `${filters.timestamp.from}-${filters.timestamp.to}`,
      tone: "time",
    });
  }

  const filterRows: Array<[keyof NonNullable<SearchPlanDto["filters"]>, string]> = [
    ["event_id", "Event ID"],
    ["source", "Source"],
    ["severity", "Severity"],
    ["event_type", "Event type"],
    ["user", "User"],
    ["host", "Host"],
    ["ip", "Source IP"],
    ["country_code", "Country"],
  ];

  for (const [key, label] of filterRows) {
    const value = filters?.[key] as string | string[] | null | undefined;
    if (hasValue(value)) {
      rows.push({
        field: label,
        value:
          key === "country_code" ? formatCountryValue(value) : joinValue(value),
        keyValue: key === "country_code" ? countryCodes(value).join(",") : joinValue(value),
        tone: key === "severity" ? "severity" : "default",
      });
    }
  }

  if (hasValue(searchPlan.message_query)) {
    rows.push({
      field: "Message contains",
      value: searchPlan.message_query ?? "",
      keyValue: searchPlan.message_query ?? "",
    });
  }

  if (searchPlan.mode === "aggregation" && searchPlan.aggregation) {
    rows.push({
      field: "Aggregation",
      value: AGGREGATION_LABELS[searchPlan.aggregation.type],
      keyValue: searchPlan.aggregation.type,
      tone: "aggregation",
    });

    if (hasValue(searchPlan.aggregation.field)) {
      rows.push({
        field: "Group by",
        value: fieldLabel(searchPlan.aggregation.field),
        keyValue: searchPlan.aggregation.field ?? "",
        tone: "aggregation",
      });
    }

    if (searchPlan.aggregation.top_n) {
      rows.push({
        field: "Limit",
        value: `Top ${searchPlan.aggregation.top_n}`,
        keyValue: String(searchPlan.aggregation.top_n),
        tone: "aggregation",
      });
    }

    if (searchPlan.aggregation.interval) {
      rows.push({
        field: "Interval",
        value: searchPlan.aggregation.interval,
        keyValue: searchPlan.aggregation.interval,
        tone: "time",
      });
    }

    if (searchPlan.aggregation.order) {
      rows.push({
        field: "Bucket order",
        value: searchPlan.aggregation.order === "desc" ? "Highest first" : "Lowest first",
        keyValue: searchPlan.aggregation.order,
        tone: "aggregation",
      });
    }
  }

  const firstSort = searchPlan.sort?.[0];
  if (firstSort) {
    const key = `${firstSort.field}:${firstSort.order}` as keyof typeof SORT_LABELS;
    rows.push({
      field: "Sort",
      value: SORT_LABELS[key] ?? `${fieldLabel(firstSort.field)} ${firstSort.order}`,
      keyValue: `${firstSort.field}:${firstSort.order}`,
    });
  }

  const visualization = visualizationFor(searchPlan, chartMetadata);
  rows.push({
    field: "Visualization",
    value: visualization,
    keyValue: visualization,
    tone: "aggregation",
  });

  return rows;
}

function VisualizationIcon({ searchPlan }: { searchPlan: SearchPlanDto }) {
  if (searchPlan.mode === "search") {
    return <Table2 className="size-4" />;
  }
  if (searchPlan.aggregation?.type === "date_histogram") {
    return <LineChart className="size-4" />;
  }
  if (searchPlan.aggregation?.type === "count") {
    return <Hash className="size-4" />;
  }
  return <BarChart3 className="size-4" />;
}

function valueClassName(tone: BreakdownRow["tone"]) {
  switch (tone) {
    case "time":
      return "border-cyan-300/25 bg-cyan-300/12 text-cyan-100 shadow-[0_0_18px_-14px_#22d3ee]";
    case "severity":
      return "border-amber-300/25 bg-amber-300/12 text-amber-100";
    case "aggregation":
      return "border-violet-300/25 bg-violet-300/12 text-violet-100";
    default:
      return "border-slate-600/70 bg-slate-900/70 text-slate-100";
  }
}

function FieldIcon({ field }: { field: string }) {
  const className = "size-4 text-cyan-300/75";

  if (field === "Mode") {
    return <Gauge className={className} />;
  }
  if (field === "Time range" || field === "Interval") {
    return <CalendarClock className={className} />;
  }
  if (field === "Aggregation" || field === "Group by" || field === "Bucket order") {
    return <Network className={className} />;
  }
  if (field === "Limit") {
    return <Hash className={className} />;
  }
  if (field === "Visualization") {
    return <BarChart3 className={className} />;
  }
  if (field === "User") {
    return <UserRound className={className} />;
  }
  if (field === "Host" || field === "Source") {
    return <Server className={className} />;
  }
  if (field === "Source IP" || field === "Country") {
    return <Globe2 className={className} />;
  }
  if (field === "Message contains") {
    return <MessageSquareText className={className} />;
  }
  if (field === "Sort") {
    return <ListFilter className={className} />;
  }
  if (field === "Event type" || field === "Severity") {
    return <Filter className={className} />;
  }
  if (field === "Event ID") {
    return <Hash className={className} />;
  }

  return <Search className={className} />;
}

export function QueryBreakdown({
  searchPlan,
  chartMetadata,
  className,
}: QueryBreakdownProps) {
  if (!searchPlan) {
    return (
      <div className={cn("rounded-[1.35rem] border border-cyan-200/30 bg-[linear-gradient(145deg,rgba(94,116,126,0.26),rgba(15,38,52,0.78)_42%,rgba(8,19,31,0.94))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(34,211,238,0.07),0_22px_80px_-50px_rgba(125,211,252,0.9)] backdrop-blur-xl", className)}>
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-50">
          <span className="grid size-9 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
            <ListTree className="size-4" />
          </span>
          Query Breakdown
        </div>
        <p className="mt-3 text-sm text-slate-400">
          No SearchPlan available to build a query breakdown.
        </p>
      </div>
    );
  }

  const rows = buildRows(searchPlan, chartMetadata);

  return (
    <div className={cn("rounded-[1.35rem] border border-cyan-200/30 bg-[linear-gradient(145deg,rgba(94,116,126,0.26),rgba(15,38,52,0.78)_42%,rgba(8,19,31,0.94))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(34,211,238,0.07),0_22px_80px_-50px_rgba(125,211,252,0.9)] backdrop-blur-xl", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_20px_-12px_#22d3ee]">
            <ListTree className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-slate-50">
            Query Breakdown
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_18px_-14px_#22d3ee]">
          <VisualizationIcon searchPlan={searchPlan} />
          {searchPlan.mode}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-cyan-200/20 bg-slate-950/35 shadow-inner shadow-black/20">
        <div className="grid grid-cols-[minmax(8rem,13rem)_1fr] border-b border-cyan-200/25 bg-cyan-200/[0.035] text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/60">
          <div className="px-4 py-2.5">Field</div>
          <div className="border-l border-cyan-300/15 px-4 py-2.5">Value</div>
        </div>
        <div className="divide-y divide-cyan-200/20">
          {rows.map((row) => (
            <div
              key={`${row.field}-${row.keyValue}`}
              className="grid grid-cols-[minmax(8rem,13rem)_1fr] bg-slate-950/15 transition hover:bg-cyan-200/[0.045]"
            >
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-300">
                <FieldIcon field={row.field} />
                <span>{row.field}</span>
              </div>
              <div className="border-l border-cyan-200/20 px-4 py-2.5">
                <span
                  className={cn(
                    "inline-flex max-w-full rounded-lg border px-2.5 py-1 text-sm font-semibold leading-5",
                    valueClassName(row.tone),
                  )}
                >
                  <span className="min-w-0">{row.value}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
