import { describe, expect, it } from 'vitest'

import { ApiError } from '@/services/api-client'
import { toUiError } from '@/services/api-error-messages'

describe('toUiError', () => {
  it('maps 403 to a clear permission alert message', () => {
    const error = toUiError(
      new ApiError({
        status: 403,
        message: 'Forbidden',
        errors: ['Insufficient role'],
      }),
    )

    expect(error.status).toBe(403)
    expect(error.message).toBe(
      'You do not have permission to perform this action.',
    )
    expect(error.errors).toEqual([])
  })

  it('maps 401 to a session expired message', () => {
    const error = toUiError(
      new ApiError({
        status: 401,
        message: 'Unauthorized',
      }),
    )

    expect(error.status).toBe(401)
    expect(error.message).toBe(
      'Your session has expired. Please sign in again.',
    )
  })
})
