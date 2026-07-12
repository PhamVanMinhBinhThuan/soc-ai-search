import { ApiError, isRecord, requestJson } from '@/shared/services/api/api-client'

export type AuthMeResponseDto = {
  authenticated: boolean
  identity: string
  username: string | null
  email: string | null
  roles: string[]
}

function assertAuthMeResponse(
  payload: unknown,
): asserts payload is AuthMeResponseDto {
  if (
    !isRecord(payload) ||
    typeof payload.authenticated !== 'boolean' ||
    typeof payload.identity !== 'string' ||
    !Array.isArray(payload.roles) ||
    !payload.roles.every((role) => typeof role === 'string')
  ) {
    throw new ApiError({
      status: 502,
      message: 'The backend returned an invalid auth/me response',
      errors: ['Auth user contract validation failed'],
    })
  }
}

export async function getCurrentUser(signal?: AbortSignal) {
  const payload = await requestJson('/api/v1/auth/me', { signal })
  assertAuthMeResponse(payload)
  return payload
}
