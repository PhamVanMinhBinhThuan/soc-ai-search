import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ResultTabs } from '@/components/soc/result-tabs'
import type {
  AggregationResultItemDto,
  ChartMetadataDto,
  SearchEventDto,
} from '@/types/soc'

afterEach(() => cleanup())

const baseProps = {
  mode: 'search' as const,
  activeTab: 'raw' as const,
  events: [],
  aggregationResults: [],
  chartMetadata: null,
  total: 0,
  page: 0,
  size: 10,
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

const event: SearchEventDto = {
  event_id: 'seed-42-1001',
  timestamp: '2026-06-18T01:02:03Z',
  source: 'windows-auth',
  severity: 'critical',
  event_type: 'failed_login',
  user: 'admin',
  host: 'dc-prod-01',
  ip: '203.0.113.45',
  country_code: 'CN',
  message: 'Failed login detected',
}

const aggregationResults: AggregationResultItemDto[] = [
  { key: 'admin', value: 42 },
  { key: 'root', value: 12 },
]

const chartMetadata: ChartMetadataDto = {
  chart_type: 'BAR',
  x_axis_label: 'User',
  y_axis_label: 'Events',
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

  it('disables CSV export while the parent marks export unavailable', () => {
    render(
      <ResultTabs
        {...baseProps}
        canExportCsv
        queryId={null}
        exportDisabled
      />,
    )

    expect(
      screen.getByRole('button', { name: /export results as csv/i }),
    ).toBeDisabled()
    expect(screen.getByTitle(/no query available/i)).toBeInTheDocument()
  })
})

describe('ResultTabs polymorphic rendering', () => {
  it('activates raw events for search mode and disables analytics', () => {
    const onSelectEvent = vi.fn()
    render(
      <ResultTabs
        {...baseProps}
        canExportCsv
        events={[event]}
        total={1}
        totalPages={1}
        onSelectEvent={onSelectEvent}
      />,
    )

    expect(
      screen.getByRole('tab', { name: /raw events/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('tab', { name: /analytics view/i }),
    ).toBeDisabled()
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('windows-auth')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('row', { name: /open event seed-42-1001/i }),
    )
    expect(onSelectEvent).toHaveBeenCalledWith('seed-42-1001')
  })

  it('activates analytics for aggregation mode and disables raw events', () => {
    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={aggregationResults}
        chartMetadata={chartMetadata}
        total={54}
      />,
    )

    expect(
      screen.getByRole('tab', { name: /analytics view/i }),
    ).toBeEnabled()
    expect(
      screen.getByRole('tab', { name: /raw events/i }),
    ).toBeDisabled()
    expect(screen.getByText(/summary table/i)).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('paginates aggregation summary table at 10 rows without trimming chart data', () => {
    const manyAggregationResults = Array.from({ length: 12 }, (_, index) => ({
      key: `bucket-${index + 1}`,
      value: index + 1,
    }))

    render(
      <ResultTabs
        {...baseProps}
        mode="aggregation"
        activeTab="analytics"
        canExportCsv
        aggregationResults={manyAggregationResults}
        chartMetadata={chartMetadata}
        total={78}
      />,
    )

    expect(screen.getByText('bucket-1')).toBeInTheDocument()
    expect(screen.getByText('bucket-10')).toBeInTheDocument()
    expect(screen.queryByText('bucket-11')).not.toBeInTheDocument()
    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 1 - 10 of 12')

    fireEvent.click(screen.getByRole('button', { name: /next summary page/i }))

    expect(screen.queryByText('bucket-1')).not.toBeInTheDocument()
    expect(screen.getByText('bucket-11')).toBeInTheDocument()
    expect(screen.getByText('bucket-12')).toBeInTheDocument()
  })

  it('renders empty state for successful search with no events', () => {
    render(<ResultTabs {...baseProps} canExportCsv />)

    expect(screen.getByText(/no matching events/i)).toBeInTheDocument()
    expect(
      screen.getByText(/no raw events matched the validated SearchPlan/i),
    ).toBeInTheDocument()
  })
})
