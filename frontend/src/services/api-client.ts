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

export function setAccessTokenProvider(
  provider: (() => string | null) | null,
) {
  accessTokenProvider = provider
}

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

export function authHeaders(): HeadersInit {
  const token = accessTokenProvider?.()
  return token ? { Authorization: `Bearer ${token}` } : {}
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
    response = await fetch(apiUrl(path), {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...init.headers,
      },
    })
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
