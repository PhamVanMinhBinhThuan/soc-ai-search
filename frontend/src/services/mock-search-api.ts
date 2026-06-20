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
    original_question: request.question,
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
