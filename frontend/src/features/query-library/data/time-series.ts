import { QUERY_LIBRARY_ITEMS } from '@/features/query-library/data/items'

export const TIME_SERIES_QUERY_LIBRARY_ITEMS = QUERY_LIBRARY_ITEMS.filter(
  (item) =>
    item.categories.includes('time_series') ||
    item.categories.includes('line_chart'),
)

