import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SocSidebar } from '@/components/soc/soc-sidebar'

afterEach(() => cleanup())

function renderSidebar(roles: string[], authLoading = false) {
  render(
    <SocSidebar
      identity="demo-user"
      roles={roles}
      authLoading={authLoading}
      authEnabled
    />,
  )
}

function expectRemovedNavigationItems() {
  expect(
    screen.queryByRole('button', { name: /overview/i }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /alerts/i }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /network map/i }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /ai analyst/i }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /settings/i }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /help & support/i }),
  ).not.toBeInTheDocument()
}

describe('SocSidebar RBAC navigation', () => {
  it('hides history and admin navigation for viewer', () => {
    renderSidebar(['SOC_VIEWER'])

    expect(
      screen.getByRole('button', { name: /event search/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /investigations/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /admin console/i }),
    ).not.toBeInTheDocument()
    expectRemovedNavigationItems()
  })

  it('shows history for analyst but not admin console', () => {
    renderSidebar(['SOC_ANALYST'])

    expect(
      screen.getByRole('button', { name: /event search/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /investigations/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /admin console/i }),
    ).not.toBeInTheDocument()
    expectRemovedNavigationItems()
  })

  it('shows admin entry only for admin', () => {
    renderSidebar(['SOC_ADMIN'])

    expect(
      screen.getByRole('button', { name: /event search/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /admin console/i }),
    ).toBeInTheDocument()
    expectRemovedNavigationItems()
  })

  it('does not render sensitive entries while auth is loading', () => {
    renderSidebar(['SOC_ADMIN'], true)

    expect(
      screen.getByRole('button', { name: /event search/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /investigations/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /admin console/i }),
    ).not.toBeInTheDocument()
    expectRemovedNavigationItems()
  })
})
