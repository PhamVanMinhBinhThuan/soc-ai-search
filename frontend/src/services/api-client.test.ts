import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  requestJson,
  setAccessTokenProvider,
  setAccessTokenRefreshProvider,
} from '@/services/api-client'

describe('api-client auth headers', () => {
  afterEach(() => {
    setAccessTokenProvider(null)
    setAccessTokenRefreshProvider(null)
    vi.unstubAllGlobals()
  })

  it('does not attach Authorization when no token provider is configured', async () => {
    const fetchMock = vi.fn(
      async (...args: [RequestInfo | URL, RequestInit?]) => {
        void args
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    await requestJson('/api/v1/search/history')

    const [, init] = fetchMock.mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it('attaches Bearer token through Authorization header when token provider is configured', async () => {
    const fetchMock = vi.fn(
      async (...args: [RequestInfo | URL, RequestInit?]) => {
        void args
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    )
    vi.stubGlobal('fetch', fetchMock)
    setAccessTokenProvider(() => 'access-token-123')

    await requestJson('/api/v1/search')

    const [url, init] = fetchMock.mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(url).toBe('/api/v1/search')
    expect(headers.Authorization).toBe('Bearer access-token-123')
  })

  it('refreshes the token once and retries a 401 request with the new token', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>
        if (headers.Authorization === 'Bearer fresh-token') {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }

        return new Response(
          JSON.stringify({
            message: 'Unauthorized',
            errors: ['Authentication is required'],
          }),
          {
            status: 401,
            headers: { 'content-type': 'application/json' },
          },
        )
      },
    )
    const refreshToken = vi.fn().mockResolvedValue('fresh-token')

    vi.stubGlobal('fetch', fetchMock)
    setAccessTokenProvider(() => 'stale-token')
    setAccessTokenRefreshProvider(refreshToken)

    await expect(requestJson('/api/v1/search/plan')).resolves.toEqual({
      ok: true,
    })

    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      (fetchMock.mock.calls[0][1]?.headers as Record<string, string>)
        .Authorization,
    ).toBe('Bearer stale-token')
    expect(
      (fetchMock.mock.calls[1][1]?.headers as Record<string, string>)
        .Authorization,
    ).toBe('Bearer fresh-token')
  })

  it('uses a single token refresh for concurrent 401 requests', async () => {
    let resolveRefresh: (value: string) => void = () => undefined
    const refreshPromise = new Promise<string>((resolve) => {
      resolveRefresh = resolve
    })
    const refreshToken = vi.fn(() => refreshPromise)
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>
        if (headers.Authorization === 'Bearer fresh-token') {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      },
    )

    vi.stubGlobal('fetch', fetchMock)
    setAccessTokenProvider(() => 'stale-token')
    setAccessTokenRefreshProvider(refreshToken)

    const requests = [
      requestJson('/api/v1/search/plan'),
      requestJson('/api/v1/search/plan'),
      requestJson('/api/v1/search/plan'),
      requestJson('/api/v1/search/plan'),
      requestJson('/api/v1/search/plan'),
    ]

    await vi.waitFor(() => {
      expect(refreshToken).toHaveBeenCalledTimes(1)
    })
    resolveRefresh('fresh-token')

    await expect(Promise.all(requests)).resolves.toEqual([
      { ok: true },
      { ok: true },
      { ok: true },
      { ok: true },
      { ok: true },
    ])

    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(10)
  })

  it('throws the original 401 when token refresh returns null', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    )

    vi.stubGlobal('fetch', fetchMock)
    setAccessTokenProvider(() => 'stale-token')
    setAccessTokenRefreshProvider(vi.fn().mockResolvedValue(null))

    await expect(requestJson('/api/v1/search/plan')).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<ApiError>)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not refresh more than once when the retry also returns 401', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const refreshToken = vi.fn().mockResolvedValue('fresh-token')

    vi.stubGlobal('fetch', fetchMock)
    setAccessTokenProvider(() => 'stale-token')
    setAccessTokenRefreshProvider(refreshToken)

    await expect(requestJson('/api/v1/search/plan')).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<ApiError>)
    expect(refreshToken).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
