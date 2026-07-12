import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  requestJson,
  setAuthTokenHandlers,
} from '@/shared/services/api/api-client'

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  setAuthTokenHandlers(null)
  vi.unstubAllGlobals()
})

describe('requestJson', () => {
  it('retries concurrent 401 responses with one shared token refresh', async () => {
    const refreshAccessToken = vi.fn(async () => 'fresh-token')
    setAuthTokenHandlers({
      getAccessToken: () => 'expired-token',
      refreshAccessToken,
    })

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 2 }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      Promise.all([requestJson('/first'), requestJson('/second')]),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }])

    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/first',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/second',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      }),
    )
  })

  it('maps non-json failure responses to a stable ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 502 })),
    )

    await expect(requestJson('/broken')).rejects.toMatchObject({
      status: 502,
      message: 'The server returned an unexpected error response',
    } satisfies Partial<ApiError>)
  })
})
