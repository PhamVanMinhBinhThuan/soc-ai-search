import { QUERY_LIBRARY_ITEMS } from '@/lib/query-library/items'

export const AGGREGATION_QUERY_LIBRARY_ITEMS = QUERY_LIBRARY_ITEMS.filter(
  (item) => item.categories.includes('aggregation'),
)

