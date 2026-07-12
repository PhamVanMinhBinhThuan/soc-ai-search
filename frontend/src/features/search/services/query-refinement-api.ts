import {
  ApiError,
  isRecord,
  requestJson,
} from '@/shared/services/api/api-client'
import { isMockMode } from '@/features/search/services/search-api'
import type { SearchPlanDto } from '@/shared/types/soc'

export type QueryRefinementRequestDto = {
  original_question: string
  current_question: string
  current_search_plan: SearchPlanDto
  refinement: string
}

export type QueryRefinementResponseDto = {
  rewritten_question: string
  source: string
  latency_ms: number
}

function assertQueryRefinementResponse(
  payload: unknown,
): asserts payload is QueryRefinementResponseDto {
  if (
    !isRecord(payload) ||
    typeof payload.rewritten_question !== 'string' ||
    payload.rewritten_question.trim().length === 0 ||
    typeof payload.source !== 'string' ||
    typeof payload.latency_ms !== 'number' ||
    !Number.isFinite(payload.latency_ms) ||
    payload.latency_ms < 0
  ) {
    throw new ApiError({
      status: 502,
      message: 'The backend returned an invalid query refinement response',
      errors: ['Query refinement response contract validation failed'],
    })
  }
}

export async function refineQuery(
  request: QueryRefinementRequestDto,
  signal?: AbortSignal,
) {
  if (isMockMode) {
    const refinement = request.refinement.toLowerCase()
    const rewrittenQuestion =
      refinement.includes('vpn.user') && refinement.includes('7')
        ? 'Show failed login events from China for admin or vpn.user in the last 7 days'
        : `${request.current_question} ${request.refinement}`.trim()

    return {
      rewritten_question: rewrittenQuestion,
      source: 'mock',
      latency_ms: 0,
    } satisfies QueryRefinementResponseDto
  }

  const payload = await requestJson('/api/v1/search/refine', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  assertQueryRefinementResponse(payload)
  return payload
}
