type ApiErrorOptions = {
  status: number
  message: string
  errors?: string[]
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: string[]

  constructor({ status, message, errors = [], cause }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
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
