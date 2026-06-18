import '@testing-library/jest-dom/vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  SearchErrorState,
  SearchIdleState,
  SearchLoadingState,
} from '@/components/soc/search-status'

afterEach(() => cleanup())

describe('search request states', () => {
  it('renders a skeleton and busy state while search is loading', () => {
    const { container } = render(<SearchLoadingState />)

    expect(screen.getByText(/searching soc events/i)).toBeInTheDocument()
    expect(
      screen.getByText(/generating searchplan and querying elasticsearch/i),
    ).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('aria-busy', 'true')
  })

  it('renders idle guidance for the initial state', () => {
    render(<SearchIdleState isMock={false} />)

    expect(screen.getByText(/start a soc investigation/i)).toBeInTheDocument()
    expect(
      screen.getByText(/converted into a validated SearchPlan/i),
    ).toBeInTheDocument()
  })

  it('renders API errors with retry and HTTP status', () => {
    const onRetry = vi.fn()

    render(
      <SearchErrorState
        error={{
          status: 503,
          message: 'LLM provider is unavailable',
          errors: ['LLM request failed'],
        }}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText(/search request failed/i)).toBeInTheDocument()
    expect(
      screen.getByText(/llm provider is unavailable/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/http status: 503/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
