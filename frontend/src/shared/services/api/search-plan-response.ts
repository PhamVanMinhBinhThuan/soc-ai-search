import { ApiError, isRecord } from '@/shared/services/api/api-client'
import type {
  AggregationResultItemDto,
  AggregationType,
  ChartMetadataDto,
  NaturalLanguageSearchResponseDto,
  SearchEventDto,
  SearchMode,
  SearchPlanDto,
  SearchPlanResponseDto,
  SummarySource,
} from '@/shared/types/soc'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SearchPlanResponseOptions = {
  requireSummary?: boolean
}

function isNonNegativeNumber(value: unknown) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

function isSearchMode(value: unknown): value is SearchMode {
  return value === 'search' || value === 'aggregation'
}

function isAggregationType(value: unknown): value is AggregationType {
  return (
    value === 'count' ||
    value === 'group_by' ||
    value === 'top_n' ||
    value === 'date_histogram'
  )
}

function isSummarySource(value: unknown): value is SummarySource {
  return value === 'llm' || value === 'fallback'
}

function isOptionalNumber(value: unknown) {
  return value === undefined || value === null || isNonNegativeNumber(value)
}

function isOptionalArray(value: unknown) {
  return value === undefined || value === null || Array.isArray(value)
}

function invalidSearchPlanResponse(errors: string[]) {
  return new ApiError({
    status: 502,
    message: 'The backend returned an invalid SearchPlan response',
    errors,
  })
}

export function assertSearchPlanResponse(
  payload: unknown,
  options: SearchPlanResponseOptions = {},
): asserts payload is SearchPlanResponseDto {
  const errors: string[] = []

  if (!isRecord(payload)) {
    throw invalidSearchPlanResponse([
      'SearchPlan response must be a JSON object',
    ])
  }

  if (typeof payload.query_id !== 'string' || !uuidPattern.test(payload.query_id)) {
    errors.push('query_id must be a UUID string')
  }

  if (!isSearchMode(payload.mode)) {
    errors.push('mode must be search or aggregation')
  }

  if (
    payload.aggregation_type !== undefined &&
    payload.aggregation_type !== null &&
    !isAggregationType(payload.aggregation_type)
  ) {
    errors.push('aggregation_type must be a supported aggregation type or null')
  }

  if (!isRecord(payload.generated_dsl)) {
    errors.push('generated_dsl must be a JSON object')
  }

  for (const field of ['total', 'page', 'size', 'total_pages', 'latency_ms']) {
    if (!isNonNegativeNumber(payload[field])) {
      errors.push(`${field} must be a non-negative number`)
    }
  }

  for (const field of ['search_latency_ms', 'summary_latency_ms']) {
    if (!isOptionalNumber(payload[field])) {
      errors.push(`${field} must be a non-negative number when present`)
    }
  }

  if (options.requireSummary) {
    if (typeof payload.summary !== 'string' || payload.summary.trim().length === 0) {
      errors.push('summary must be a non-empty string when requested')
    }
    if (!isSummarySource(payload.summary_source)) {
      errors.push('summary_source must be llm or fallback when summary is requested')
    }
  } else {
    if (
      payload.summary !== undefined &&
      payload.summary !== null &&
      typeof payload.summary !== 'string'
    ) {
      errors.push('summary must be a string or null when present')
    }
    if (
      payload.summary_source !== undefined &&
      payload.summary_source !== null &&
      !isSummarySource(payload.summary_source)
    ) {
      errors.push('summary_source must be llm, fallback, or null when present')
    }
  }

  if (!isOptionalArray(payload.aggregation_results)) {
    errors.push('aggregation_results must be an array when present')
  }
  if (
    payload.chart_metadata !== undefined &&
    payload.chart_metadata !== null &&
    !isRecord(payload.chart_metadata)
  ) {
    errors.push('chart_metadata must be an object or null when present')
  }
  if (!isOptionalArray(payload.events)) {
    errors.push('events must be an array when present')
  }

  if (errors.length > 0) {
    throw invalidSearchPlanResponse(errors)
  }
}

export function normalizeSearchPlanResponse(
  payload: SearchPlanResponseDto,
  searchPlan: SearchPlanDto,
  originalQuestion: string,
): NaturalLanguageSearchResponseDto {
  return {
    query_id: payload.query_id,
    original_question: originalQuestion,
    summary: payload.summary ?? '',
    summary_source: payload.summary_source ?? 'fallback',
    mode: payload.mode,
    search_plan: searchPlan,
    generated_dsl: payload.generated_dsl,
    total: payload.total,
    page: payload.page,
    size: payload.size,
    total_pages: payload.total_pages,
    llm_latency_ms: 0,
    summary_latency_ms: payload.summary_latency_ms ?? 0,
    search_latency_ms: payload.search_latency_ms ?? payload.latency_ms,
    latency_ms: payload.latency_ms,
    aggregation_type: payload.aggregation_type ?? null,
    aggregation_results:
      (payload.aggregation_results as AggregationResultItemDto[] | undefined) ??
      [],
    chart_metadata:
      (payload.chart_metadata as ChartMetadataDto | null | undefined) ?? null,
    events: (payload.events as SearchEventDto[] | undefined) ?? [],
  }
}
