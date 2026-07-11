import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, setAccessTokenProvider, setAccessTokenRefreshProvider } from '@/services/api-client'
import { runSearchPlan } from '@/services/search-plan-api'
import type { SearchPlanDto, SearchPlanResponseDto } from '@/types/soc'

const basePlan: SearchPlanDto = {
  mode: 'search',
  filters: {
    timestamp: { from: 'now-24h', to: 'now' },
    event_type: ['failed_login'],
  },
  aggregation: null,
  message_query: null,
  page: 0,
  size: 10,
}

const validPlanResponse: SearchPlanResponseDto = {
  query_id: '00000000-0000-4000-8000-000000000010',
  mode: 'search',
  aggregation_type: null,
  generated_dsl: {
    query: {
      bool: {
        filter: [{ terms: { event_type: ['failed_login'] } }],
      },
    },
  },
  total: 42,
  page: 0,
  size: 10,
  total_pages: 5,
  search_latency_ms: 11,
  summary_latency_ms: 17,
  latency_ms: 28,
  summary: 'There are 42 failed login events in the selected time range.',
  summary_source: 'llm',
  aggregation_results: [],
  chart_metadata: null,
  events: [],
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  setAccessTokenProvider(null)
  setAccessTokenRefreshProvider(null)
  vi.unstubAllGlobals()
})

describe('runSearchPlan response contract', () => {
  it('normalizes a valid SearchPlan execution response for the search UI', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(validPlanResponse))
    vi.stubGlobal('fetch', fetchMock)

    const response = await runSearchPlan(
      basePlan,
      undefined,
      'failed login in 24h',
      true,
      true,
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/search/plan?include_summary=true&audit=true&summary_question=failed+login+in+24h',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(response.query_id).toBe(validPlanResponse.query_id)
    expect(response.original_question).toBe('failed login in 24h')
    expect(response.search_plan).toEqual(basePlan)
    expect(response.summary).toBe(validPlanResponse.summary)
    expect(response.summary_source).toBe('llm')
    expect(response.generated_dsl).toEqual(validPlanResponse.generated_dsl)
  })

  it('allows null summary when the caller explicitly disables summary generation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...validPlanResponse,
          summary: null,
          summary_source: null,
          summary_latency_ms: 0,
        }),
      ),
    )

    const response = await runSearchPlan(
      basePlan,
      undefined,
      'page two',
      false,
      false,
    )

    expect(response.summary).toBe('')
    expect(response.summary_source).toBe('fallback')
    expect(response.summary_latency_ms).toBe(0)
  })

  it('rejects missing summary when summary generation was requested', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...validPlanResponse,
          summary: null,
          summary_source: null,
        }),
      ),
    )

    await expect(runSearchPlan(basePlan, undefined, 'needs summary')).rejects.toMatchObject({
      status: 502,
      message: 'The backend returned an invalid SearchPlan response',
      errors: expect.arrayContaining([
        'summary must be a non-empty string when requested',
        'summary_source must be llm or fallback when summary is requested',
      ]),
    } satisfies Partial<ApiError>)
  })

  it('rejects generated_dsl when the backend returns JSON as an escaped string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse({
          ...validPlanResponse,
          generated_dsl: '{"query":{"match_all":{}}}',
        }),
      ),
    )

    await expect(runSearchPlan(basePlan, undefined, 'bad dsl')).rejects.toMatchObject({
      status: 502,
      errors: expect.arrayContaining(['generated_dsl must be a JSON object']),
    } satisfies Partial<ApiError>)
  })
})
