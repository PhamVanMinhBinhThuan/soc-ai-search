import { describe, expect, it } from 'vitest'

import { initialMockResponse } from '@/services/mock-search-api'

describe('mock search API defaults', () => {
  it('uses 10 rows for the initial mock search response', () => {
    const response = initialMockResponse()

    expect(response.size).toBe(10)
    expect(response.search_plan.size).toBe(10)
  })
})
