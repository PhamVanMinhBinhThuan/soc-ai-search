import { QUERY_LIBRARY_ITEMS } from '@/features/query-library/data/items'

export const SEARCH_QUERY_LIBRARY_ITEMS = QUERY_LIBRARY_ITEMS.filter((item) =>
  item.categories.includes('search'),
)

