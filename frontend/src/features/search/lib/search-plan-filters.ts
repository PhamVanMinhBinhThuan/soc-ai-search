import type { SearchPlanDto, SearchSortField, SortOrder } from '@/shared/types/soc'

type SearchSortPlan = NonNullable<SearchPlanDto['sort']>[number]

export function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

export function formatEntityInput(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return value ?? ''
}

export function parseEntityInput(value: string) {
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return values.length > 0 ? values : null
}

export function parseEventIdInput(value: string) {
  const values = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return values.length > 0 ? values : null
}

export function parseCountryCodeInput(value: string) {
  const values = value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)

  return values.length > 0 ? values : null
}

export function formatSearchSortValue(sort?: SearchSortPlan | null) {
  return sort ? `${sort.field}:${sort.order}` : 'timestamp:desc'
}

export function parseSearchSortValue(value: string): {
  field: SearchSortField
  order: SortOrder
} {
  const [field, order] = value.split(':') as [SearchSortField, SortOrder]
  return { field, order }
}
