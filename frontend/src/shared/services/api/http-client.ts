import { ApiError, errorPayload } from '@/shared/services/api/api-error'
import { currentAccessToken, refreshTokenOnce } from '@/shared/services/api/auth-token'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? ''
const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, '')

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

function requestHeaders(init: RequestInit, tokenOverride?: string | null) {
  const token = tokenOverride ?? currentAccessToken()

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
