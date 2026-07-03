import '@testing-library/jest-dom/vitest'

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SocDashboard } from './soc-dashboard'
import type { SearchPlanResponseDto } from '@/types/soc'

const mockState = vi.hoisted(() => ({
  executeSearchPlan: vi.fn(),
}))

vi.mock('@/services/search-api', () => ({
  executeSearchPlan: mockState.executeSearchPlan,
}))

function searchPlanResponse(
  overrides: Partial<SearchPlanResponseDto> = {},
): SearchPlanResponseDto {
  return {
    query_id: 'dashboard-query',
    mode: 'search',
    search_plan: {
      mode: 'search',
      page: 0,
      size: 1,
      filters: {},
      aggregation: null,
      message_query: null,
    },
    generated_dsl: {},
    total: 7,
    page: 0,
    size: 1,
    total_pages: 1,
    latency_ms: 10,
    search_latency_ms: 10,
    summary_latency_ms: 0,
    summary: null,
    summary_source: null,
    aggregation_type: null,
    aggregation_results: [],
    chart_metadata: null,
    events: [],
    ...overrides,
  } as SearchPlanResponseDto
}

async function flushDashboardWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  mockState.executeSearchPlan.mockResolvedValue(searchPlanResponse())
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('SocDashboard auth readiness', () => {
  it('does not fetch metrics while auth is still loading', () => {
    render(
      <SocDashboard
        authEnabled
        authLoading
        authenticated
        accessTokenReady={false}
      />,
    )

    expect(mockState.executeSearchPlan).not.toHaveBeenCalled()
    expect(screen.getByText(/loading dashboard metrics/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
  })

  it('does not fetch metrics before an access token is ready', () => {
    render(
      <SocDashboard
        authEnabled
        authLoading={false}
        authenticated
        accessTokenReady={false}
      />,
    )

    expect(mockState.executeSearchPlan).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled()
  })

  it('fetches dashboard metrics when auth and token are ready', async () => {
    render(
      <SocDashboard
        authEnabled
        authLoading={false}
        authenticated
        accessTokenReady
      />,
    )

    await waitFor(() => {
      expect(mockState.executeSearchPlan).toHaveBeenCalledTimes(5)
    })
    expect(screen.getByRole('button', { name: /refresh/i })).toBeEnabled()
    expect(
      screen.getByText(/auto refresh every 3 minutes/i),
    ).toBeInTheDocument()
  })

  it('keeps auth-disabled local mode fetchable without a token', async () => {
    render(<SocDashboard />)

    await waitFor(() => {
      expect(mockState.executeSearchPlan).toHaveBeenCalledTimes(5)
    })
  })

  it('auto-refreshes metrics every 3 minutes while dashboard is mounted', async () => {
    vi.useFakeTimers()

    render(
      <SocDashboard
        authEnabled
        authLoading={false}
        authenticated
        accessTokenReady
      />,
    )

    await flushDashboardWork()
    expect(mockState.executeSearchPlan).toHaveBeenCalledTimes(5)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000)
    })
    await flushDashboardWork()

    expect(mockState.executeSearchPlan).toHaveBeenCalledTimes(10)
  })

  it('does not auto-refresh before auth and token are ready', async () => {
    vi.useFakeTimers()

    render(
      <SocDashboard
        authEnabled
        authLoading={false}
        authenticated
        accessTokenReady={false}
      />,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000)
    })

    expect(mockState.executeSearchPlan).not.toHaveBeenCalled()
  })

  it('cleans up the auto-refresh interval after unmount', async () => {
    vi.useFakeTimers()

    const { unmount } = render(
      <SocDashboard
        authEnabled
        authLoading={false}
        authenticated
        accessTokenReady
      />,
    )

    await flushDashboardWork()
    expect(mockState.executeSearchPlan).toHaveBeenCalledTimes(5)

    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3 * 60 * 1000)
    })

    expect(mockState.executeSearchPlan).toHaveBeenCalledTimes(5)
  })
})
