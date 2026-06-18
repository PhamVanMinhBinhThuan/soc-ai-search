import {
  ApiError,
  isRecord,
  requestJson,
} from '@/services/api-client'
import {
  getMockEventDetail,
  searchMockEvents,
} from '@/services/mock-search-api'
import type {
  EventDetailResponseDto,
  NaturalLanguageSearchRequestDto,
  NaturalLanguageSearchResponseDto,
} from '@/types/soc'

export const isMockMode =
  import.meta.env.VITE_USE_MOCK === 'true'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isNonNegativeNumber(value: unknown) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  )
}

function assertSearchResponse(
  payload: unknown,
): asserts payload is NaturalLanguageSearchResponseDto {
  if (
    !isRecord(payload) ||
    typeof payload.query_id !== 'string' ||
    !uuidPattern.test(payload.query_id) ||
    (payload.mode !== 'search' && payload.mode !== 'aggregation') ||
    !isRecord(payload.search_plan) ||
    !isRecord(payload.generated_dsl) ||
    typeof payload.summary !== 'string' ||
    payload.summary.trim().length === 0 ||
    (payload.summary_source !== 'llm' &&
      payload.summary_source !== 'fallback') ||
    !isNonNegativeNumber(payload.summary_latency_ms) ||
    !isNonNegativeNumber(payload.total) ||
    !isNonNegativeNumber(payload.page) ||
    !isNonNegativeNumber(payload.size) ||
    !isNonNegativeNumber(payload.total_pages) ||
    !isNonNegativeNumber(payload.llm_latency_ms) ||
    !isNonNegativeNumber(payload.search_latency_ms) ||
    !isNonNegativeNumber(payload.latency_ms) ||
    !Array.isArray(payload.events) ||
    !Array.isArray(payload.aggregation_results)
  ) {
    throw new ApiError({
      status: 502,
      message: 'The backend returned an invalid search response',
      errors: ['Search response contract validation failed'],
    })
  }
}

function assertEventDetail(
  payload: unknown,
): asserts payload is EventDetailResponseDto {
  if (
    !isRecord(payload) ||
    typeof payload.event_id !== 'string' ||
    typeof payload.index_name !== 'string' ||
    typeof payload.raw !== 'string'
  ) {
    throw new ApiError({
      status: 502,
      message: 'The backend returned an invalid event detail response',
    })
  }
}

export async function searchEvents(
  request: NaturalLanguageSearchRequestDto,
  signal?: AbortSignal,
) {
  if (isMockMode) {
    return searchMockEvents(request, signal)
  }

  const payload = await requestJson('/api/v1/search', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  assertSearchResponse(payload)
  return payload
}

export async function getEventDetail(
  eventId: string,
  signal?: AbortSignal,
) {
  if (isMockMode) {
    return getMockEventDetail(eventId, signal)
  }

  const payload = await requestJson(
    `/api/v1/events/${encodeURIComponent(eventId)}`,
    { signal },
  )
  assertEventDetail(payload)
  return payload
}
