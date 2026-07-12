import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/services/api/api-client'
import { searchEvents } from '@/features/search/services/search-api'
import type { NaturalLanguageSearchResponseDto } from '@/shared/types/soc'

const validSearchResponse: NaturalLanguageSearchResponseDto = {
  query_id: '00000000-0000-4000-8000-000000000001',
  original_question: 'failed login china',
  mode: 'search',
  search_plan: {
    mode: 'search',
    filters: {
      timestamp: { from: 'now-24h', to: 'now' },
      event_type: ['failed_login'],
      country_code: ['CN'],
    },
    aggregation: null,
    message_query: null,
    page: 0,
    size: 5,
  },
  generated_dsl: {
    query: {
      bool: {
        filter: [
          { terms: { event_type: ['failed_login'] } },
          { terms: { country_code: ['CN'] } },
        ],
      },
    },
    from: 0,
    size: 5,
  },
  total: 1,
  page: 0,
  size: 5,
  total_pages: 1,
  llm_latency_ms: 10,
  search_latency_ms: 20,
  summary_latency_ms: 2,
  latency_ms: 32,
  summary: 'Three sentence summary. It is plain text. It is safe.',
  summary_source: 'llm',
  aggregation_type: null,
  aggregation_results: [],
  chart_metadata: null,
  events: [
    {
      event_id: 'seed-42-1001',
      timestamp: '2026-06-18T01:02:03Z',
      source: 'windows-auth',
      severity: 'critical',
      event_type: 'failed_login',
      user: 'admin',
      host: 'dc-prod-01',
      ip: '203.0.113.45',
      country_code: 'CN',
      message: 'Failed login detected',
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchEvents response contract', () => {
  it('accepts a valid polymorphic search response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(validSearchResponse)))

    const response = await searchEvents({
      question: 'failed login china',
      page: 0,
      size: 5,
    })

    expect(response.mode).toBe('search')
    expect(response.generated_dsl).toEqual(validSearchResponse.generated_dsl)
    expect(response.events).toHaveLength(1)
  })

  it('rejects generated_dsl when the backend returns JSON as an escaped string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...validSearchResponse,
          generated_dsl: '{"query":{"match_all":{}}}',
        }),
      ),
    )

    await expect(
      searchEvents({
        question: 'failed login china',
        page: 0,
        size: 5,
      }),
    ).rejects.toMatchObject({
      status: 502,
      message: 'The backend returned an invalid search response',
    } satisfies Partial<ApiError>)
  })

  it('surfaces backend 401 and 403 without retrying internally', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ message: 'Forbidden', errors: ['Insufficient role'] }, 403),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      searchEvents({
        question: 'failed login china',
        page: 0,
        size: 5,
      }),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
      errors: ['Insufficient role'],
    } satisfies Partial<ApiError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
