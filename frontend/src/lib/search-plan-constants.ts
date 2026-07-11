import type { SearchSortField, Severity, SortOrder } from '@/types/soc'

export const SUMMARY_TABLE_PAGE_SIZE = 10

export const MAX_EVENT_ID_FILTERS = 20

export const SEVERITY_OPTIONS: Severity[] = [
  'critical',
  'high',
  'medium',
  'low',
]

export const EVENT_TYPE_OPTIONS = [
  'failed_login',
  'account_lockout',
  'firewall_block',
  'malware_detected',
  'privilege_escalation',
  'suspicious_outbound',
  'data_exfiltration',
  'large_transfer',
  'successful_login',
  'dns_query',
  'process_start',
  'file_access',
] as const

export const SEARCH_SORT_OPTIONS: {
  label: string
  field: SearchSortField
  order: SortOrder
}[] = [
  { label: 'Newest first', field: 'timestamp', order: 'desc' },
  { label: 'Oldest first', field: 'timestamp', order: 'asc' },
  { label: 'Highest severity first', field: 'severity', order: 'desc' },
  { label: 'Lowest severity first', field: 'severity', order: 'asc' },
]
