import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EventDetailDrawer } from '@/components/soc/event-detail-drawer'
import type { EventDetailResponseDto } from '@/types/soc'

afterEach(() => cleanup())

const eventDetail: EventDetailResponseDto = {
  event_id: 'seed-42-1001',
  index_name: 'soc-events-v1',
  timestamp: '2026-06-13T08:42:16Z',
  source: 'windows-auth',
  severity: 'critical',
  event_type: 'failed_login',
  user: 'admin',
  host: 'dc-prod-01',
  ip: '203.0.113.45',
  country_code: 'CN',
  message: 'Failed login detected',
  raw: 'timestamp=2026-06-13T08:42:16Z event_type=failed_login',
  raw_visible: true,
}

describe('EventDetailDrawer RBAC rendering', () => {
  it('shows formatted fields with event id but without index', () => {
    render(
      <EventDetailDrawer
        event={eventDetail}
        status="success"
        error={null}
        canViewRawLog
        open
        onOpenChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/event id/i)).toBeInTheDocument()
    expect(screen.getByText('seed-42-1001')).toBeInTheDocument()
    expect(screen.queryByText('soc-events-v1')).not.toBeInTheDocument()
    expect(screen.getByText('13/06/2026, 03:42 PM')).toBeInTheDocument()
  })

  it('locks raw log when backend redacts raw data for viewer', () => {
    render(
      <EventDetailDrawer
        event={{
          ...eventDetail,
          raw: null,
          raw_visible: false,
        }}
        status="success"
        error={null}
        canViewRawLog={false}
        open
        onOpenChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/raw log locked/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/requires SOC_ANALYST or SOC_ADMIN/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/timestamp=2026/i)).not.toBeInTheDocument()
  })

  it('shows raw log for analyst/admin when backend returns it', () => {
    render(
      <EventDetailDrawer
        event={eventDetail}
        status="success"
        error={null}
        canViewRawLog
        open
        onOpenChange={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.queryByText(/raw log locked/i)).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /raw log/i })).toBeEnabled()
  })

  it('closes from the centered modal close button', () => {
    const onOpenChange = vi.fn()

    render(
      <EventDetailDrawer
        event={eventDetail}
        status="success"
        error={null}
        canViewRawLog
        open
        onOpenChange={onOpenChange}
        onRetry={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /close event details/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
