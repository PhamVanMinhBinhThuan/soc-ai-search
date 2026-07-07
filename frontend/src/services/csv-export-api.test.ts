import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/api-client'
import { exportSearchCsv } from '@/services/csv-export-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('exportSearchCsv', () => {
  it('reads CSV blob, safe filename, and truncated header', async () => {
    const csv = 'event_id,message\r\nseed-42-1001,hello\r\n'
    const fetchMock = vi.fn(
      async () =>
        new Response(csv, {
          status: 200,
          headers: {
            'content-type': 'text/csv',
            'content-disposition':
              'attachment; filename="soc:search/export?.csv"',
            'x-export-truncated': 'true',
          },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await exportSearchCsv(
      '00000000-0000-4000-8000-000000000001',
    )

    expect(result.filename).toBe('soc-ai-search.csv')
    expect(result.truncated).toBe(true)
    expect(await result.blob.text()).toBe(csv)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to query_id filename when Content-Disposition is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('key,value\r\nadmin,42\r\n', {
            status: 200,
            headers: { 'content-type': 'text/csv' },
          }),
      ),
    )

    const result = await exportSearchCsv(
      '00000000-0000-4000-8000-000000000099',
    )

    expect(result.filename).toBe('soc-ai-search.csv')
    expect(result.truncated).toBe(false)
  })

  it('throws a clear ApiError for forbidden export', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              message: 'You do not have permission to export CSV files.',
              errors: ['SOC_ANALYST role required'],
            }),
            {
              status: 403,
              headers: { 'content-type': 'application/json' },
            },
          ),
      ),
    )

    await expect(
      exportSearchCsv('00000000-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({
      status: 403,
      message: 'You do not have permission to export CSV files.',
      errors: ['SOC_ANALYST role required'],
    } satisfies Partial<ApiError>)
  })
})
