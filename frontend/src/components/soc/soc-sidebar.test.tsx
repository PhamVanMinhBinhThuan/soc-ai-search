import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
      screen.queryByRole('button', { name: /system audit logs/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin tools/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keycloak console/i })).not.toBeInTheDocument()
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
      screen.queryByRole('button', { name: /system audit logs/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin tools/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keycloak console/i })).not.toBeInTheDocument()
    expectRemovedNavigationItems()
  })

  it('shows admin entry only for admin', () => {
    renderSidebar(['SOC_ADMIN'])

    expect(
      screen.getByRole('button', { name: /event search/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /system audit logs/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin tools/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keycloak console/i })).not.toBeInTheDocument()
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
      screen.queryByRole('button', { name: /system audit logs/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /admin tools/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keycloak console/i })).not.toBeInTheDocument()
    expectRemovedNavigationItems()
  })
})

describe('SocSidebar Query Library navigation', () => {
  it('renders Query Library as a single item and not under a Guide dropdown', () => {
    renderSidebar(['SOC_VIEWER'])

    // Query Library should always be visible
    expect(screen.getByRole('button', { name: /query library/i })).toBeInTheDocument()

    // Guide group should no longer exist
    expect(screen.queryByRole('button', { name: /^guide$/i })).not.toBeInTheDocument()
  })

  it('calls onPageChange when Query Library is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <SocSidebar
        identity="demo-user"
        roles={['SOC_VIEWER']}
        authLoading={false}
        authEnabled
        onPageChange={onPageChange}
      />
    )

    const btn = screen.getByRole('button', { name: /query library/i })
    fireEvent.click(btn)

    expect(onPageChange).toHaveBeenCalledWith('query-library')
  })

  it('calls audit handlers when System Audit Logs is clicked', () => {
    const onPageChange = vi.fn()
    const onOpenAuditLogs = vi.fn()

    render(
      <SocSidebar
        identity="demo-user"
        roles={['SOC_ADMIN']}
        authLoading={false}
        authEnabled
        onPageChange={onPageChange}
        onOpenAuditLogs={onOpenAuditLogs}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /system audit logs/i }))

    expect(onOpenAuditLogs).toHaveBeenCalledTimes(1)
    expect(onPageChange).toHaveBeenCalledWith('audit-logs')
  })
})
