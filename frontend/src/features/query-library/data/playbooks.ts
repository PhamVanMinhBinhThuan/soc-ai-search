import { QUERY_LIBRARY_ITEMS } from '@/features/query-library/data/items'

export const PLAYBOOK_QUERY_LIBRARY_ITEMS = QUERY_LIBRARY_ITEMS.filter((item) =>
  item.categories.includes('playbook'),
)

