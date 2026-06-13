import { ApiError, requestJson } from '@/services/api-client'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertSearchResponse(
  payload: unknown,
): asserts payload is NaturalLanguageSearchResponseDto {
  if (
    !isRecord(payload) ||
    (payload.mode !== 'search' && payload.mode !== 'aggregation') ||
    !isRecord(payload.search_plan) ||
    !isRecord(payload.generated_dsl) ||
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
