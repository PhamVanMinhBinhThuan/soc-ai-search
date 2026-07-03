type ApiErrorOptions = {
  status: number
  message: string
  errors?: string[]
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: string[]

  constructor({
    status,
    message,
    errors = [],
    cause,
  }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, '')

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

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

export function authHeaders(): HeadersInit {
  const token = accessTokenProvider?.()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function requestHeaders(init: RequestInit, tokenOverride?: string | null) {
  const token = tokenOverride ?? accessTokenProvider?.()

  return {
    Accept: 'application/json',
    ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  }
}

async function fetchWithAuth(
  path: string,
  init: RequestInit,
  tokenOverride?: string | null,
) {
  return fetch(apiUrl(path), {
    ...init,
    headers: requestHeaders(init, tokenOverride),
  })
}

async function refreshTokenOnce() {
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

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function errorPayload(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      message: 'The server returned an unexpected error response',
      errors: [] as string[],
    }
  }

  return {
    message:
      typeof payload.message === 'string'
        ? payload.message
        : 'The request could not be completed',
    errors: Array.isArray(payload.errors)
      ? payload.errors.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
  }
}

export async function requestJson(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  let response: Response

  try {
    response = await fetchWithAuth(path, init)

    if (response.status === 401 && !init.signal?.aborted) {
      const freshToken = await refreshTokenOnce()
      if (freshToken && !init.signal?.aborted) {
        response = await fetchWithAuth(path, init, freshToken)
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new ApiError({
      status: 0,
      message: 'Unable to connect to the SOC AI Search backend',
      errors: ['Check that the backend and Docker services are running'],
      cause: error,
    })
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    const apiError = errorPayload(payload)
    throw new ApiError({
      status: response.status,
      message: apiError.message,
      errors: apiError.errors,
    })
  }

  return payload
}
