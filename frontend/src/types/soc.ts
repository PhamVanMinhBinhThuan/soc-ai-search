export type SearchMode = 'search' | 'aggregation'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type SearchEventDto = {
  event_id: string
  timestamp: string
  source: string
  severity: Severity
  event_type: string
  user: string
  host: string
  ip: string
  country_code: string
  message: string
}

export type AggregationResultItemDto = {
  key: string
  value: number
}

export type EventDetailResponseDto = SearchEventDto & {
  index_name: string
  raw: string
}

export type SearchPlanDto = {
  mode: SearchMode
  filters: {
    timestamp?: {
      from: string
      to: string
    }
    severity?: Severity[]
    event_type?: string[]
    user?: string
    host?: string
    ip?: string
    country_code?: string[]
  }
  aggregation?: {
    type: 'count' | 'group_by' | 'top_n' | 'date_histogram'
    field?: string
    top_n?: number
    interval?: 'minute' | 'hour' | 'day'
  }
  message_query?: string
  page: number
  size: number
}

export type ChartType = 'NUMBER' | 'BAR' | 'LINE'

export type ChartMetadataDto = {
  chart_type: ChartType
  x_axis_label: string
  y_axis_label: string
}

export type MockScenario = {
  question: string
  shortLabel: string
  mode: SearchMode
  total: number
  llm_latency_ms: number
  search_latency_ms: number
  search_plan: SearchPlanDto
  generated_dsl: Record<string, unknown>
  aggregation_type?: 'count' | 'group_by' | 'top_n' | 'date_histogram'
  aggregation_results: AggregationResultItemDto[]
  chart_metadata?: ChartMetadataDto
  events: SearchEventDto[]
  summary: string
}
