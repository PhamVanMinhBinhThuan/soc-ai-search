import { describe, expect, it } from 'vitest'

import {
  formatEntityInput,
  formatSearchSortValue,
  parseCountryCodeInput,
  parseEntityInput,
  parseEventIdInput,
  parseSearchSortValue,
  toggleArrayValue,
} from '@/features/search/lib/search-plan-filters'

describe('search plan filter helpers', () => {
  it('toggles string values without mutating the original array', () => {
    const values = ['critical', 'high']

    expect(toggleArrayValue(values, 'critical')).toEqual(['high'])
    expect(toggleArrayValue(values, 'medium')).toEqual([
      'critical',
      'high',
      'medium',
    ])
    expect(values).toEqual(['critical', 'high'])
  })

  it('formats and parses comma-separated entity filters', () => {
    expect(formatEntityInput(['admin', 'vpn.user'])).toBe('admin, vpn.user')
    expect(formatEntityInput(null)).toBe('')
    expect(parseEntityInput(' admin, vpn.user ,, ')).toEqual([
      'admin',
      'vpn.user',
    ])
    expect(parseEntityInput('   ')).toBeNull()
  })

  it('parses event IDs from comma or newline separated input', () => {
    expect(parseEventIdInput('id-1, id-2\nid-3')).toEqual([
      'id-1',
      'id-2',
      'id-3',
    ])
    expect(parseEventIdInput('')).toBeNull()
  })

  it('normalizes country codes to uppercase', () => {
    expect(parseCountryCodeInput('cn, vn, US')).toEqual(['CN', 'VN', 'US'])
    expect(parseCountryCodeInput('')).toBeNull()
  })

  it('formats and parses search sort values', () => {
    expect(formatSearchSortValue(null)).toBe('timestamp:desc')
    expect(formatSearchSortValue({ field: 'severity', order: 'asc' })).toBe(
      'severity:asc',
    )
    expect(parseSearchSortValue('severity:desc')).toEqual({
      field: 'severity',
      order: 'desc',
    })
  })
})
