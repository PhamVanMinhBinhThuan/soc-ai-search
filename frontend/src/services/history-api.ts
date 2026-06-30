import { ApiError, apiUrl, authHeaders, errorPayload, isRecord, requestJson } from '@/services/api-client'
import { getMockSearchHistory, getMockSearchHistoryDetail, mockTogglePinHistory } from '@/services/mock-search-api'
import { isMockMode } from '@/services/search-api'
import type {
  AuditStatus,
  AuditLogFiltersDto,
  SearchHistoryDetailDto,
  SearchHistoryFiltersDto,
  SearchHistoryItemDto,
  SearchHistoryPageDto,
  SearchMode,
} from '@/types/soc'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getAuditLogs(
  page: number = 0,
  size: number = 5,
  filters?: AuditLogFiltersDto,
  signal?: AbortSignal,
): Promise<{
  items: import('@/types/soc').AuditLogItem[]
  page: number
  size: number
  total: number
  total_pages: number
}> {
  if (isMockMode) {
    // Just return empty or mock if needed
    return { items: [], page: 0, size: 0, total: 0, total_pages: 0 }
  }

  const query = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  })
  appendAuditFilters(query, filters)

  const payload = await requestJson(`/api/v1/audit-logs?${query}`, { signal })

  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    throw new Error('Invalid audit logs response')
  }

  return {
    items: payload.items as import('@/types/soc').AuditLogItem[],
    page: (payload.page as number) || 0,
    size: (payload.size as number) || 0,
    total: (payload.total as number) || 0,
    total_pages: (payload.total_pages as number) || 0,
  }
}

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
  filters?: SearchHistoryFiltersDto,
  signal?: AbortSignal,
) {
  if (isMockMode) {
    return getMockSearchHistory(page, size, signal)
  }

  const search = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  
  if (filters?.pinned) search.set('pinned', 'true')
  appendCommonFilters(search, filters)

  const response = await requestJson(
    `/api/v1/search/history?${search.toString()}`,
    { method: 'GET', signal },
  )

  assertSearchHistoryPage(response)
  return response
}

export async function exportAuditLogs(
  filters?: AuditLogFiltersDto,
  signal?: AbortSignal,
) {
  const search = new URLSearchParams()
  appendAuditFilters(search, filters)
  const suffix = search.toString() ? `?${search.toString()}` : ''

  let response: Response
  try {
    response = await fetch(apiUrl(`/api/v1/audit-logs/export${suffix}`), {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
        ...authHeaders(),
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new ApiError({
      status: 0,
      message: 'Unable to connect to the SOC AI Search backend',
      errors: ['Check that the backend and Docker services are running'],
      cause: error,
    })
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : null
    const apiError = errorPayload(payload)
    throw new ApiError({
      status: response.status,
      message: apiError.message,
      errors: apiError.errors,
    })
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get('content-disposition')) ?? 'soc-audit-logs.csv',
    truncated: response.headers.get('X-Export-Truncated') === 'true',
  }
}

function appendAuditFilters(search: URLSearchParams, filters?: AuditLogFiltersDto) {
  appendCommonFilters(search, filters)
  if (filters?.identity?.trim()) search.set('identity', filters.identity.trim())
}

function appendCommonFilters(
  search: URLSearchParams,
  filters?: Pick<SearchHistoryFiltersDto, 'q' | 'status' | 'mode' | 'from' | 'to' | 'sort'>,
) {
  if (filters?.q?.trim()) search.set('q', filters.q.trim())
  if (filters?.status && filters.status !== 'all') search.set('status', filters.status)
  if (filters?.mode && filters.mode !== 'all') search.set('mode', filters.mode)
  if (filters?.from) search.set('from', filters.from)
  if (filters?.to) search.set('to', filters.to)
  if (filters?.sort) search.set('sort', filters.sort)
}

function filenameFromDisposition(value: string | null) {
  if (!value) return null
  const match = /filename="?([^";]+)"?/i.exec(value)
  return match?.[1] ?? null
}

export async function getSearchHistoryDetail(
  queryId: string,
  signal?: AbortSignal,
): Promise<SearchHistoryDetailDto> {
  if (isMockMode) {
    return getMockSearchHistoryDetail(queryId, signal) as Promise<SearchHistoryDetailDto>
  }

  const response = await requestJson(`/api/v1/search/history/${queryId}`, {
    method: 'GET',
    signal,
  })
  
  if (!isRecord(response)) throw new Error('Invalid history detail response')
  return response as unknown as SearchHistoryDetailDto
}

export async function togglePinHistory(
  queryId: string,
  pinned: boolean,
  signal?: AbortSignal,
): Promise<SearchHistoryItemDto> {
  if (isMockMode) {
    return mockTogglePinHistory(queryId, pinned, signal)
  }

  const response = await requestJson(`/api/v1/search/history/${queryId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
    signal,
  })
  
  if (!isRecord(response)) throw new Error('Invalid history pin response')
  return response as unknown as SearchHistoryItemDto
}
