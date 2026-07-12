import '@testing-library/jest-dom/vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthGateView } from '@/features/auth/components/auth-gate'
import type { SocAuthState } from '@/features/auth/auth-context'

afterEach(() => cleanup())

function authState(overrides: Partial<SocAuthState> = {}): SocAuthState {
  return {
    enabled: false,
    loading: false,
    authenticated: true,
    identity: 'demo-analyst',
    username: 'demo-analyst',
    email: null,
    roles: ['SOC_ANALYST'],
    accessToken: null,
    errorMessage: null,
    refreshAccessToken: vi.fn(async () => null),
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

describe('AuthGateView', () => {
  it('renders dashboard content without login when auth is disabled', () => {
    render(
      <AuthGateView auth={authState()}>
        <div>Dashboard ready</div>
      </AuthGateView>,
    )

    expect(screen.getByText('Dashboard ready')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /access console/i }),
    ).not.toBeInTheDocument()
  })

  it('renders login state and calls signIn when auth is enabled but user is not authenticated', () => {
    const signIn = vi.fn()
    render(
      <AuthGateView
        auth={authState({
          enabled: true,
          authenticated: false,
          signIn,
        })}
      >
        <div>Dashboard ready</div>
      </AuthGateView>,
    )

    expect(screen.queryByText('Dashboard ready')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: /access console/i }),
    )
    expect(signIn).toHaveBeenCalledTimes(1)
  })

  it('renders a session restore loading state while OIDC is loading', () => {
    render(
      <AuthGateView
        auth={authState({
          enabled: true,
          authenticated: false,
          loading: true,
        })}
      >
        <div>Dashboard ready</div>
      </AuthGateView>,
    )

    expect(screen.getByText(/securing your connection/i)).toBeInTheDocument()
    expect(screen.queryByText('Dashboard ready')).not.toBeInTheDocument()
  })
})
