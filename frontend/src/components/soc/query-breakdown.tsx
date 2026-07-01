import { BarChart3, Hash, LineChart, ListTree, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  AggregationType,
  ChartMetadataDto,
  SearchPlanDto,
  SearchSortField,
} from "@/types/soc";

type QueryBreakdownProps = {
  searchPlan: SearchPlanDto | null;
  chartMetadata?: ChartMetadataDto | null;
  className?: string;
};

type BreakdownRow = {
  field: string;
  value: string;
  tone?: "default" | "time" | "severity" | "aggregation";
};

const COUNTRY_DISPLAY: Record<string, string> = {
  CN: "🇨🇳 China",
  DE: "🇩🇪 Germany",
  RU: "🇷🇺 Russia",
  SG: "🇸🇬 Singapore",
  US: "🇺🇸 United States",
  VN: "🇻🇳 Vietnam",
};

const FIELD_LABELS: Record<string, string> = {
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

function formatCountryValue(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .map((code) => COUNTRY_DISPLAY[code] ?? code)
    .join(", ");
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
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date) + " UTC";
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

function visualizationFor(searchPlan: SearchPlanDto, chartMetadata?: ChartMetadataDto | null) {
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
      tone: "aggregation",
    },
  ];

  const filters = searchPlan.filters;
  if (filters?.timestamp?.from && filters.timestamp.to) {
    rows.push({
      field: "Time range",
      value: formatTimeRange(filters.timestamp.from, filters.timestamp.to),
      tone: "time",
    });
  }

  const filterRows: Array<[keyof NonNullable<SearchPlanDto["filters"]>, string]> = [
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
        value: key === "country_code" ? formatCountryValue(value) : joinValue(value),
        tone: key === "severity" ? "severity" : "default",
      });
    }
  }

  if (hasValue(searchPlan.message_query)) {
    rows.push({
      field: "Message contains",
      value: searchPlan.message_query ?? "",
    });
  }

  if (searchPlan.mode === "aggregation" && searchPlan.aggregation) {
    rows.push({
      field: "Aggregation",
      value: AGGREGATION_LABELS[searchPlan.aggregation.type],
      tone: "aggregation",
    });

    if (hasValue(searchPlan.aggregation.field)) {
      rows.push({
        field: "Group by",
        value: fieldLabel(searchPlan.aggregation.field),
        tone: "aggregation",
      });
    }

    if (searchPlan.aggregation.top_n) {
      rows.push({
        field: "Limit",
        value: `Top ${searchPlan.aggregation.top_n}`,
        tone: "aggregation",
      });
    }

    if (searchPlan.aggregation.interval) {
      rows.push({
        field: "Interval",
        value: searchPlan.aggregation.interval,
        tone: "time",
      });
    }

    if (searchPlan.aggregation.order) {
      rows.push({
        field: "Bucket order",
        value: searchPlan.aggregation.order === "desc" ? "Highest first" : "Lowest first",
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
    });
  }

  rows.push({
    field: "Visualization",
    value: visualizationFor(searchPlan, chartMetadata),
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
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
    case "severity":
      return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    case "aggregation":
      return "border-violet-400/20 bg-violet-400/10 text-violet-200";
    default:
      return "border-zinc-700 bg-zinc-900/70 text-zinc-200";
  }
}

export function QueryBreakdown({
  searchPlan,
  chartMetadata,
  className,
}: QueryBreakdownProps) {
  if (!searchPlan) {
    return (
      <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5", className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ListTree className="size-4 text-cyan-300" />
          Query Breakdown
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          No SearchPlan available to build a query breakdown.
        </p>
      </div>
    );
  }

  const rows = buildRows(searchPlan, chartMetadata);

  return (
    <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
            <ListTree className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
            Query Breakdown
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
          <VisualizationIcon searchPlan={searchPlan} />
          {searchPlan.mode}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <div className="grid grid-cols-[minmax(7rem,11rem)_1fr] border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          <div className="px-3 py-2">Field</div>
          <div className="border-l border-zinc-800 px-3 py-2">Value</div>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {rows.map((row) => (
            <div
              key={`${row.field}-${row.value}`}
              className="grid grid-cols-[minmax(7rem,11rem)_1fr] bg-zinc-950/30"
            >
              <div className="px-3 py-2.5 text-sm font-medium text-zinc-400">
                {row.field}
              </div>
              <div className="border-l border-zinc-800 px-3 py-2">
                <span
                  className={cn(
                    "inline-flex max-w-full rounded-lg border px-2.5 py-1 text-sm font-medium leading-5",
                    valueClassName(row.tone),
                  )}
                >
                  <span className="truncate">{row.value}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
