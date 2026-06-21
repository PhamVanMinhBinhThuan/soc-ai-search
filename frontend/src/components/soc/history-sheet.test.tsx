import '@testing-library/jest-dom/vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HistorySheet } from '@/components/soc/history-sheet'
import type {
  SearchHistoryItemDto,
  SearchHistoryPageDto,
} from '@/types/soc'

afterEach(() => cleanup())

const historyItem: SearchHistoryItemDto = {
  query_id: '00000000-0000-4000-8000-000000000001',
  question: 'Show me failed login attempts from China in the last 24h',
  mode: 'search',
  result_count: 5,
  latency_ms: 1200,
  status: 'SUCCESS',
  created_at: '2026-06-10T10:00:00Z',
  pinned: false,
  pinned_at: null,
}

const historyPage: SearchHistoryPageDto = {
  items: [historyItem],
  page: 0,
  size: 5,
  total: 1,
  total_pages: 1,
}

function renderHistorySheet(
  overrides: Partial<Parameters<typeof HistorySheet>[0]> = {},
) {
  const props: Parameters<typeof HistorySheet>[0] = {
    open: true,
    status: 'success',
    response: historyPage,
    error: null,
    onOpenChange: vi.fn(),
    onPageChange: vi.fn(),
    onRunAgain: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }

  render(<HistorySheet {...props} />)
  return props
}

describe('HistorySheet', () => {
  it('renders skeleton cards while history is loading', () => {
    renderHistorySheet({
      status: 'loading',
      response: null,
    })

    expect(
      screen.getByText(/loading recent investigations/i),
    ).toBeInTheDocument()
  })

  it('renders an empty state when no history exists', () => {
    renderHistorySheet({
      status: 'empty',
      response: {
        items: [],
        page: 0,
        size: 5,
        total: 0,
        total_pages: 0,
      },
    })

    expect(screen.getByText(/no investigations yet/i)).toBeInTheDocument()
  })

  it('renders error state and retries without crashing', () => {
    const onRetry = vi.fn()
    renderHistorySheet({
      status: 'error',
      response: null,
      error: {
        status: 403,
        message: 'You do not have permission to view search history.',
        errors: [],
      },
      onRetry,
    })

    expect(
      screen.getAllByText(/history could not be loaded/i).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(/do not have permission/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('runs a history item again when the card is clicked', () => {
    const onRunAgain = vi.fn()
    renderHistorySheet({ onRunAgain })

    fireEvent.click(
      screen.getByRole('button', {
        name: /run query again: show me failed login attempts/i,
      }),
    )

    expect(onRunAgain).toHaveBeenCalledWith(historyItem)
  })
})
