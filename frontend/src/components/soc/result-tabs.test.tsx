import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ResultTabs } from '@/components/soc/result-tabs'

afterEach(() => cleanup())

const baseProps = {
  mode: 'search' as const,
  activeTab: 'raw' as const,
  events: [],
  aggregationResults: [],
  chartMetadata: null,
  total: 0,
  page: 0,
  size: 20,
  totalPages: 0,
  isMockMode: false,
  queryId: '00000000-0000-4000-8000-000000000001',
  exportStatus: 'idle' as const,
  exportMessage: null,
  exportDisabled: false,
  timeRangeLabel: 'Last 24h',
  onTabChange: vi.fn(),
  onPageChange: vi.fn(),
  onSelectEvent: vi.fn(),
  onExport: vi.fn(),
}

describe('ResultTabs RBAC rendering', () => {
  it('disables CSV export for viewer role', () => {
    render(
      <ResultTabs
        {...baseProps}
        canExportCsv={false}
        exportDisabled
      />,
    )

    expect(
      screen.getByRole('button', { name: /csv export requires analyst role/i }),
    ).toBeDisabled()
    expect(screen.getByText(/export locked/i)).toBeInTheDocument()
  })

  it('enables CSV export for analyst/admin roles', () => {
    render(<ResultTabs {...baseProps} canExportCsv />)

    expect(
      screen.getByRole('button', { name: /export results as csv/i }),
    ).toBeEnabled()
  })
})
