import '@testing-library/jest-dom/vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App'
import type { SocAuthState } from '@/auth/auth-context'
import type { SearchHistoryPageDto } from '@/types/soc'

const mockState = vi.hoisted(() => ({
  auth: {} as SocAuthState,
  getSearchHistory: vi.fn(),
}))

vi.mock('@/auth/use-auth', () => ({
  useSocAuth: () => mockState.auth,
}))

vi.mock('@/services/history-api', () => ({
  getSearchHistory: mockState.getSearchHistory,
}))

const emptyHistory: SearchHistoryPageDto = {
  items: [],
  page: 0,
  size: 20,
  total: 0,
  total_pages: 0,
}

function authState(overrides: Partial<SocAuthState> = {}): SocAuthState {
  return {
    enabled: true,
    loading: false,
    authenticated: true,
    identity: 'analyst.demo',
    username: 'analyst.demo',
    email: null,
    roles: ['SOC_ANALYST'],
    accessToken: 'access-token',
    errorMessage: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  mockState.auth = authState()
  mockState.getSearchHistory.mockResolvedValue(emptyHistory)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App history UX', () => {
  it('does not fetch history until an analyst opens the history sheet', async () => {
    render(<App />)

    expect(mockState.getSearchHistory).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: /^investigations$/i }),
    )

    await waitFor(() => {
      expect(mockState.getSearchHistory).toHaveBeenCalledTimes(1)
    })
    expect(mockState.getSearchHistory).toHaveBeenCalledWith(
      0,
      20,
      expect.any(AbortSignal),
    )
  })

  it('does not render history entry or fetch history for viewer role', () => {
    mockState.auth = authState({
      identity: 'viewer.demo',
      username: 'viewer.demo',
      roles: ['SOC_VIEWER'],
    })

    render(<App />)

    expect(
      screen.queryByRole('button', { name: /^investigations$/i }),
    ).not.toBeInTheDocument()
    expect(mockState.getSearchHistory).not.toHaveBeenCalled()
  })
})
