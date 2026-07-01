import {
  initialScenario,
  mockEventDetails,
  mockScenarios,
} from '@/lib/mock-data'
import { ApiError } from '@/services/api-client'
import type {
  EventDetailResponseDto,
  MockScenario,
  NaturalLanguageSearchRequestDto,
  NaturalLanguageSearchResponseDto,
  SearchHistoryPageDto,
  SearchPlanDto,
  SearchPlanResponseDto,
} from '@/types/soc'

const MOCK_DELAY_MS = 300

function waitForMock(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was aborted', 'AbortError'))
      return
    }

    const timeout = window.setTimeout(resolve, MOCK_DELAY_MS)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout)
        reject(new DOMException('The request was aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

function findMockScenario(question: string) {
  const normalizedQuestion = question.trim().toLocaleLowerCase()
  return mockScenarios.find(
    (scenario) =>
      scenario.question.trim().toLocaleLowerCase() === normalizedQuestion,
  )
}

export function mockScenarioToResponse(
  scenario: MockScenario,
  request: NaturalLanguageSearchRequestDto,
): NaturalLanguageSearchResponseDto {
  const scenarioIndex = Math.max(mockScenarios.indexOf(scenario), 0)
  const totalPages =
    scenario.mode === 'search'
      ? Math.ceil(scenario.total / request.size)
      : 0
  const generatedDsl = structuredClone(scenario.generated_dsl)

  if (
    scenario.mode === 'search' &&
    typeof generatedDsl.from === 'number'
  ) {
    generatedDsl.from = request.page * request.size
    generatedDsl.size = request.size
  }

  return {
    query_id: `00000000-0000-4000-8000-${String(scenarioIndex + 1).padStart(12, '0')}`,
    original_question: request.audit_question ?? request.question,
    mode: scenario.mode,
    search_plan: {
      ...structuredClone(scenario.search_plan),
      aggregation: scenario.search_plan.aggregation ?? null,
      message_query: scenario.search_plan.message_query ?? null,
      page: request.page,
      size: request.size,
    },
    generated_dsl: generatedDsl,
    total: scenario.total,
    page: request.page,
    size: request.size,
    total_pages: totalPages,
    llm_latency_ms: scenario.llm_latency_ms,
    search_latency_ms: scenario.search_latency_ms,
    summary_latency_ms: Math.max(
      1,
      Math.round(scenario.llm_latency_ms * 0.12),
    ),
    latency_ms:
      scenario.llm_latency_ms +
      scenario.search_latency_ms +
      Math.max(1, Math.round(scenario.llm_latency_ms * 0.12)),
    summary: scenario.summary,
    summary_source: 'llm',
    aggregation_type: scenario.aggregation_type ?? null,
    aggregation_results: structuredClone(
      scenario.aggregation_results,
    ),
    chart_metadata: scenario.chart_metadata
      ? structuredClone(scenario.chart_metadata)
      : null,
    events:
      scenario.mode === 'search'
        ? structuredClone(scenario.events)
        : [],
  }
}

export function initialMockResponse() {
  return mockScenarioToResponse(initialScenario, {
    question: initialScenario.question,
    page: 0,
    size: 10,
  })
}

export async function searchMockEvents(
  request: NaturalLanguageSearchRequestDto,
  signal?: AbortSignal,
) {
  await waitForMock(signal)
  const scenario = findMockScenario(request.question)

  if (!scenario) {
    throw new ApiError({
      status: 400,
      message: 'This question is not available in mock mode',
      errors: ['Choose one of the supported Suggested Queries'],
    })
  }

  return mockScenarioToResponse(scenario, request)
}

export async function executeMockSearchPlan(
  plan: SearchPlanDto,
  signal?: AbortSignal,
): Promise<SearchPlanResponseDto> {
  await waitForMock(signal)

  // A very basic mock implementation for the dashboard widgets.
  // We check the plan payload to return some fake data matching the request.
  const isFailedLogins = plan.filters?.event_type?.includes('failed_login')
  const isCriticalHigh = plan.filters?.severity?.includes('critical')

  if (plan.mode === 'search') {
    return {
      mode: 'search',
      generated_dsl: { query: 'mock search plan' },
      total: isFailedLogins ? 312 : isCriticalHigh ? 482 : 1946,
      latency_ms: 50,
      events: [],
    }
  }

  if (plan.aggregation?.type === 'date_histogram') {
    return {
      mode: 'aggregation',
      aggregation_type: 'date_histogram',
      generated_dsl: { aggs: 'mock date histogram' },
      total: 1946,
      latency_ms: 100,
      aggregation_results: Array.from({ length: 24 }).map((_, i) => ({
        key: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toISOString(),
        value: Math.floor(Math.random() * 500) + 100,
      })),
    }
  }

  if (plan.aggregation?.type === 'group_by' && plan.aggregation.field === 'severity') {
    return {
      mode: 'aggregation',
      aggregation_type: 'group_by',
      generated_dsl: { aggs: 'mock severity' },
      total: 1946,
      latency_ms: 45,
      aggregation_results: [
        { key: 'Critical', value: 186 },
        { key: 'High', value: 296 },
        { key: 'Medium', value: 742 },
        { key: 'Low', value: 722 },
      ],
    }
  }

  if (plan.aggregation?.type === 'top_n' && plan.aggregation.field === 'ip') {
    return {
      mode: 'aggregation',
      aggregation_type: 'top_n',
      generated_dsl: { aggs: 'mock top ip' },
      total: 1946,
      latency_ms: 80,
      aggregation_results: [
        { key: '203.0.113.45', value: 874 },
        { key: '198.51.100.22', value: 612 },
        { key: '192.0.2.178', value: 433 },
        { key: '203.0.113.91', value: 287 },
        { key: '198.51.100.7', value: 154 },
      ],
    }
  }

  // Fallback
  return {
    mode: plan.mode,
    aggregation_type: plan.aggregation?.type ?? null,
    generated_dsl: {},
    total: 0,
    latency_ms: 10,
    aggregation_results: [],
  }
}

export async function getMockSearchHistory(
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<SearchHistoryPageDto> {
  await waitForMock(signal)

  const successfulItems = [...mockScenarios]
    .reverse()
    .map((scenario, reverseIndex) => {
      const scenarioIndex = mockScenarios.indexOf(scenario)
      return {
        query_id: `00000000-0000-4000-8000-${String(scenarioIndex + 1).padStart(12, '0')}`,
        question: scenario.question,
        mode: scenario.mode,
        result_count: scenario.total,
        latency_ms:
          scenario.llm_latency_ms + scenario.search_latency_ms,
        status: 'SUCCESS' as const,
        created_at: new Date(
          Date.UTC(2026, 5, 14, 9, 30 - reverseIndex * 4),
        ).toISOString(),
        pinned: reverseIndex === 0 || reverseIndex === 3, // Mock some pins
        pinned_at: (reverseIndex === 0 || reverseIndex === 3) ? new Date().toISOString() : null,
      }
    })
  const items = [
    ...successfulItems,
    {
      query_id: '00000000-0000-4000-8000-000000000099',
      question: 'unsupported mock investigation',
      mode: null,
      result_count: null,
      latency_ms: null,
      status: 'FAILED' as const,
      created_at: new Date(Date.UTC(2026, 5, 14, 8, 55)).toISOString(),
      pinned: false,
      pinned_at: null,
    },
  ]
  const start = page * size

  return {
    items: items.slice(start, start + size),
    page,
    size,
    total: items.length,
    total_pages: items.length === 0 ? 0 : Math.ceil(items.length / size),
  }
}

export async function getMockEventDetail(
  eventId: string,
  signal?: AbortSignal,
): Promise<EventDetailResponseDto> {
  await waitForMock(signal)
  const event = mockEventDetails[eventId]

  if (!event) {
    throw new ApiError({
      status: 404,
      message: `Event not found: ${eventId}`,
    })
  }

  return structuredClone(event)
}

export async function getMockSearchHistoryDetail(
  queryId: string,
  signal?: AbortSignal,
) {
  await waitForMock(signal)
  const items = await getMockSearchHistory(0, 100, signal) // fetch all mocks
  const item = items.items.find(i => i.query_id === queryId)
  if (!item) {
    throw new ApiError({
      status: 404,
      message: `History item not found: ${queryId}`,
    })
  }

  // Find the scenario to get search plan and DSL
  const scenarioIndex = parseInt(queryId.split('-').pop() ?? '0', 10) - 1
  const scenario = mockScenarios[scenarioIndex]

  return {
    ...item,
    search_plan: scenario?.search_plan ?? null,
    generated_dsl: scenario?.generated_dsl ?? null,
    summary: scenario?.summary ?? null,
  }
}

export async function mockTogglePinHistory(
  queryId: string,
  pinned: boolean,
  signal?: AbortSignal,
) {
  await waitForMock(signal)
  const detail = await getMockSearchHistoryDetail(queryId, signal)
  return {
    ...detail,
    pinned,
    pinned_at: pinned ? new Date().toISOString() : null,
  }
}
