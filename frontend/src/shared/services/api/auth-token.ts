let accessTokenProvider: (() => string | null) | null = null
let refreshAccessTokenProvider: (() => Promise<string | null>) | null = null
let tokenRefreshPromise: Promise<string | null> | null = null

type AuthTokenHandlers = {
  getAccessToken: () => string | null
  refreshAccessToken?: () => Promise<string | null>
}

export function setAccessTokenProvider(
  provider: (() => string | null) | null,
) {
  accessTokenProvider = provider
}

export function setAccessTokenRefreshProvider(
  provider: (() => Promise<string | null>) | null,
) {
  refreshAccessTokenProvider = provider
}

export function setAuthTokenHandlers(handlers: AuthTokenHandlers | null) {
  accessTokenProvider = handlers?.getAccessToken ?? null
  refreshAccessTokenProvider = handlers?.refreshAccessToken ?? null
}

export function currentAccessToken() {
  return accessTokenProvider?.() ?? null
}

export function authHeaders(): HeadersInit {
  const token = currentAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function refreshTokenOnce() {
  if (!refreshAccessTokenProvider) return null

  if (!tokenRefreshPromise) {
    tokenRefreshPromise = refreshAccessTokenProvider()
      .catch(() => null)
      .finally(() => {
        tokenRefreshPromise = null
      })
  }

  return tokenRefreshPromise
}
