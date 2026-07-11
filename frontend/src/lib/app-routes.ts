export type SocPage =
  | 'dashboard'
  | 'search'
  | 'investigations'
  | 'audit-logs'
  | 'query-library'

const PAGE_PATHS: Record<SocPage, string> = {
  dashboard: '/dashboard',
  search: '/search',
  investigations: '/investigations',
  'audit-logs': '/audit-logs',
  'query-library': '/query-library',
}

export function pathForPage(page: SocPage) {
  return PAGE_PATHS[page]
}

export function pageFromPath(pathname: string): SocPage {
  const matchedPage = Object.entries(PAGE_PATHS).find(
    ([, path]) => path === pathname,
  )

  return (matchedPage?.[0] as SocPage | undefined) ?? 'search'
}
