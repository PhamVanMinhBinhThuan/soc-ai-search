import { afterEach, describe, expect, it, vi } from 'vitest'

import { requestJson, setAccessTokenProvider } from '@/services/api-client'

describe('api-client auth headers', () => {
  afterEach(() => {
    setAccessTokenProvider(null)
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
})
