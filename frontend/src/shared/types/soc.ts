export type SearchMode = "search" | "aggregation";

export type Severity = "low" | "medium" | "high" | "critical";

export type SummarySource = "llm" | "fallback";

export type AuditStatus = "SUCCESS" | "FAILED";

export type AuditLogSort = "created_at,desc" | "created_at,asc";

export type SearchHistoryFiltersDto = {
  question?: string;
  pinned?: boolean;
  status?: AuditStatus | "all";
  mode?: SearchMode | "all";
  from?: string;
  to?: string;
  sort?: AuditLogSort;
};

export type AuditLogFiltersDto = {
  question?: string;
  status?: AuditStatus | "all";
  mode?: SearchMode | "all";
  identity?: string;
  from?: string;
  to?: string;
  sort?: AuditLogSort;
};

export type AggregationType = "count" | "group_by" | "top_n" | "date_histogram";

export type SortOrder = "asc" | "desc";

export type SearchSortField =
  | "timestamp"
  | "severity"
  | "source"
  | "event_type"
  | "user"
  | "host"
  | "ip"
  | "country_code";

export type SearchEventDto = {
  event_id: string;
  timestamp: string;
  source: string;
  severity: Severity;
  event_type: string;
  user: string;
  host: string;
  ip: string;
  country_code: string;
  message: string;
};

export type AggregationResultItemDto = {
  key: string;
  value: number;
};

export type EventDetailResponseDto = SearchEventDto & {
  index_name: string;
  raw: string | null;
  raw_visible: boolean;
};

export type SearchFiltersDto = {
  timestamp?: {
    from: string;
    to: string;
  } | null;
  event_id?: string[] | null;
  severity?: Severity[] | null;
  event_type?: string[] | null;
  source?: string | string[] | null;
  user?: string | string[] | null;
  host?: string | string[] | null;
  ip?: string | string[] | null;
  country_code?: string[] | null;
};

export type SearchPlanDto = {
  mode: SearchMode;
  filters: SearchFiltersDto | null;
  aggregation: {
    type: AggregationType;
    field?: string | null;
    top_n?: number | null;
    interval?: "minute" | "hour" | "day" | null;
    order_by?: "value" | "key" | null;
    order?: SortOrder | null;
  } | null;
  message_query: string | null;
  sort?:
    | {
        field: SearchSortField;
        order: SortOrder;
      }[]
    | null;
  page: number;
  size: number;
};

export type ChartType = "NUMBER" | "BAR" | "LINE";

export type ChartMetadataDto = {
  chart_type: ChartType;
  x_axis_label: string;
  y_axis_label: string;
};

export type NaturalLanguageSearchRequestDto = {
  question: string;
  audit_question?: string;
  page: number;
  size: number;
};

export type NaturalLanguageSearchResponseDto = {
  query_id: string;
  original_question: string;
  mode: SearchMode;
  search_plan: SearchPlanDto;
  generated_dsl: Record<string, unknown>;
  total: number;
  page: number;
  size: number;
  total_pages: number;
  llm_latency_ms: number;
  search_latency_ms: number;
  summary_latency_ms: number;
  latency_ms: number;
  summary: string;
  summary_source: SummarySource;
  aggregation_type: AggregationType | null;
  aggregation_results: AggregationResultItemDto[];
  chart_metadata: ChartMetadataDto | null;
  events: SearchEventDto[];
};

export type SearchPlanResponseDto = {
  query_id: string;
  mode: SearchMode;
  aggregation_type?: AggregationType | null;
  generated_dsl: Record<string, unknown>;
  total: number;
  page: number;
  size: number;
  total_pages: number;
  search_latency_ms?: number;
  summary_latency_ms?: number;
  latency_ms: number;
  summary?: string | null;
  summary_source?: SummarySource | null;
  aggregation_results?: AggregationResultItemDto[];
  chart_metadata?: ChartMetadataDto | null;
  events?: SearchEventDto[];
};

export type SearchHistoryItemDto = {
  query_id: string;
  question: string;
  mode: SearchMode | null;
  result_count: number | null;
  latency_ms: number | null;
  status: AuditStatus;
  created_at: string;
  pinned: boolean;
  pinned_at: string | null;
};

export type SearchHistoryDetailDto = SearchHistoryItemDto & {
  search_plan: SearchPlanDto | null;
  generated_dsl: Record<string, unknown> | null;
  summary: string | null;
};

// --- Dashboard Types ---

export interface KpiData {
  total_events: number;
  critical_high_alerts: number;
  top_source_ip: string;
  failed_logins: number;
}

export interface EventsOverTimePoint {
  timestamp: string;
  events: number;
}

export interface SeverityDistributionItem {
  severity: "Critical" | "High" | "Medium" | "Low";
  count: number;
}

export interface TopSourceIpItem {
  ip: string;
  events: number;
  percentage: number;
}

export interface DashboardMetricsDto {
  kpis: KpiData;
  events_over_time: EventsOverTimePoint[];
  severity_distribution: SeverityDistributionItem[];
  top_source_ips: TopSourceIpItem[];
}

export type SearchHistoryPageDto = {
  items: SearchHistoryItemDto[];
  page: number;
  size: number;
  total: number;
  total_pages: number;
};

export type SearchErrorResponseDto = {
  message: string;
  errors: string[];
};

export type FollowUpSuggestionDto = {
  title: string;
  question: string;
};

export type FollowUpSuggestionRequestDto = {
  question: string;
  search_plan: SearchPlanDto;
  result_count: number;
  mode: SearchMode;
  sample_events: {
    event_type: string;
    severity: string;
    user: string;
    host: string;
    ip: string;
    country_code: string;
  }[];
  aggregation_buckets: {
    key: string;
    value: number;
  }[];
};

export type FollowUpSuggestionResponseDto = {
  source: "llm" | "none";
  suggestions: FollowUpSuggestionDto[];
};

export type EventErrorResponseDto = {
  message: string;
};

export type RequestStatus = "idle" | "loading" | "success" | "empty" | "error";

export type DetailStatus = "idle" | "loading" | "success" | "error";

export type HistoryStatus = "idle" | "loading" | "success" | "empty" | "error";

export type ExportStatus = "idle" | "loading" | "success" | "error";

export type UiError = {
  status: number;
  message: string;
  errors: string[];
};

export type MockScenario = {
  question: string;
  shortLabel: string;
  mode: SearchMode;
  total: number;
  llm_latency_ms: number;
  search_latency_ms: number;
  search_plan: SearchPlanDto;
  generated_dsl: Record<string, unknown>;
  aggregation_type?: AggregationType;
  aggregation_results: AggregationResultItemDto[];
  chart_metadata?: ChartMetadataDto;
  events: SearchEventDto[];
  summary: string;
};

export type AuditLogItem = {
  query_id: string;
  user_identity: string;
  question: string;
  mode: SearchMode;
  result_count: number | null;
  latency_ms: number | null;
  status: AuditStatus;
  error_message: string | null;
  created_at: string;
};
