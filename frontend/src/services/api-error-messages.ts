import { ApiError } from '@/services/api-client'
import type { UiError } from '@/types/soc'

export function toUiError(error: unknown): UiError {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        status: 401,
        message: 'Your session has expired. Please sign in again.',
        errors: [],
      }
    }

    if (error.status === 403) {
      return {
        status: 403,
        message: 'You do not have permission to perform this action.',
        errors: [],
      }
    }

    return {
      status: error.status,
      message: error.message,
      errors: error.errors,
    }
  }

  return {
    status: 0,
    message: 'An unexpected client error occurred',
    errors: [],
  }
}
