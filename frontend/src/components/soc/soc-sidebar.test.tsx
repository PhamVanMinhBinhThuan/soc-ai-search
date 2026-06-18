import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SocSidebar } from '@/components/soc/soc-sidebar'

afterEach(() => cleanup())

function renderSidebar(roles: string[], authLoading = false) {
  render(
    <SocSidebar
      identity="demo-user"
      roles={roles}
      authLoading={authLoading}
      authEnabled
      onOpenHistory={vi.fn()}
    />,
  )
}

describe('SocSidebar RBAC navigation', () => {
  it('hides history and admin navigation for viewer', () => {
    renderSidebar(['SOC_VIEWER'])

    expect(
      screen.queryByRole('button', { name: /investigations/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /admin console/i }),
    ).not.toBeInTheDocument()
  })

  it('shows history for analyst but not admin console', () => {
    renderSidebar(['SOC_ANALYST'])

    expect(
      screen.getByRole('button', { name: /investigations/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /admin console/i }),
    ).not.toBeInTheDocument()
  })

  it('shows admin entry only for admin', () => {
    renderSidebar(['SOC_ADMIN'])

    expect(
      screen.getByRole('button', { name: /admin console/i }),
    ).toBeInTheDocument()
  })

  it('does not render sensitive entries while auth is loading', () => {
    renderSidebar(['SOC_ADMIN'], true)

    expect(
      screen.queryByRole('button', { name: /investigations/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /admin console/i }),
    ).not.toBeInTheDocument()
  })
})
