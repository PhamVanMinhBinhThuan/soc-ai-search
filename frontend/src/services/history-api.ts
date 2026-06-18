import { ApiError, isRecord, requestJson } from '@/services/api-client'
import { getMockSearchHistory } from '@/services/mock-search-api'
import { isMockMode } from '@/services/search-api'
import type {
  AuditStatus,
  SearchHistoryItemDto,
  SearchHistoryPageDto,
  SearchMode,
} from '@/types/soc'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isNullableNumber(value: unknown) {
  return (
    value === null ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0)
  )
}

function assertHistoryItem(
  value: unknown,
): asserts value is SearchHistoryItemDto {
  if (!isRecord(value)) {
    throw new Error('History item is not an object')
  }

  const mode = value.mode as SearchMode | null
  const status = value.status as AuditStatus
  const createdAt =
    typeof value.created_at === 'string'
      ? Date.parse(value.created_at)
      : Number.NaN

  if (
    typeof value.query_id !== 'string' ||
    !uuidPattern.test(value.query_id) ||
    typeof value.question !== 'string' ||
    value.question.trim().length === 0 ||
    (mode !== null && mode !== 'search' && mode !== 'aggregation') ||
    !isNullableNumber(value.result_count) ||
    !isNullableNumber(value.latency_ms) ||
    (status !== 'SUCCESS' && status !== 'FAILED') ||
    !Number.isFinite(createdAt)
  ) {
    throw new Error('History item contract validation failed')
  }
}

function assertSearchHistoryPage(
  payload: unknown,
): asserts payload is SearchHistoryPageDto {
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    typeof payload.page !== 'number' ||
    !Number.isInteger(payload.page) ||
    payload.page < 0 ||
    typeof payload.size !== 'number' ||
    !Number.isInteger(payload.size) ||
    payload.size < 1 ||
    typeof payload.total !== 'number' ||
    payload.total < 0 ||
    typeof payload.total_pages !== 'number' ||
    !Number.isInteger(payload.total_pages) ||
    payload.total_pages < 0
  ) {
    throw new ApiError({
      status: 502,
      message: 'The backend returned an invalid history response',
      errors: ['History pagination contract validation failed'],
    })
  }

  try {
    payload.items.forEach(assertHistoryItem)
  } catch (error) {
    throw new ApiError({
      status: 502,
      message: 'The backend returned an invalid history response',
      errors: [
        error instanceof Error
          ? error.message
          : 'History item contract validation failed',
      ],
      cause: error,
    })
  }
}

export async function getSearchHistory(
  page: number,
  size: number,
  signal?: AbortSignal,
) {
  if (isMockMode) {
    return getMockSearchHistory(page, size, signal)
  }

  const search = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  const payload = await requestJson(
    `/api/v1/search/history?${search.toString()}`,
    { signal },
  )
  assertSearchHistoryPage(payload)
  return payload
}
