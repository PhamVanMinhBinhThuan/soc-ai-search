// ──────────────────────────────────────────────────────────────────────────────
// Query Library – static curated SOC investigation questions
// Source: plan/mini_prompts/query_library_questions.md
// ──────────────────────────────────────────────────────────────────────────────

export type QueryLibraryCategory =
  | 'search'
  | 'aggregation'
  | 'top_n'
  | 'count'
  | 'time_series'
  | 'line_chart'
  | 'bar_chart'
  | 'multi_filter'
  | 'playbook'

export type QueryLibraryExpectedView =
  | 'event_logs_table'
  | 'number'
  | 'bar_chart'
  | 'line_chart'

export type QueryLibraryItem = {
  id: string
  question: string
  categories: QueryLibraryCategory[]
  badges: string[]
  expectedView: QueryLibraryExpectedView
  tags: string[]
}

// ── Display helpers ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<QueryLibraryCategory, string> = {
  search: 'Search',
  aggregation: 'Aggregation',
  top_n: 'Top N',
  count: 'Count',
  time_series: 'Time Series',
  line_chart: 'Line Chart',
  bar_chart: 'Bar Chart',
  multi_filter: 'Multi-filter',
  playbook: 'Playbook',
}

export const BADGE_CLASS_MAP: Record<string, string> = {
  SEARCH: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
  AGGREGATION: 'border-violet-400/30 bg-violet-500/10 text-violet-100',
  COUNT: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  'TOP N': 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  LINE: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  BAR: 'border-purple-400/30 bg-purple-500/10 text-purple-100',
  PLAYBOOK: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
  'MULTI-FILTER': 'border-slate-400/30 bg-slate-500/10 text-slate-100',
  'TIME SERIES': 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  'GROUP BY': 'border-violet-400/30 bg-violet-500/10 text-violet-100',
}

export const EXPECTED_VIEW_LABELS: Record<QueryLibraryExpectedView, string> = {
  event_logs_table: 'Event logs table',
  number: 'Count result',
  bar_chart: 'Bar chart',
  line_chart: 'Line chart',
}

// ── Data ────────────────────────────────────────────────────────────────────

export const QUERY_LIBRARY_ITEMS: QueryLibraryItem[] = [
  // ─── Quick Search ───────────────────────────────────────────────────
  {
    id: 'search-failed-login-cn-24h',
    question: 'Show me failed login attempts from China in the last 24h',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['failed_login', 'CN', '24h', 'event logs'],
  },
  {
    id: 'search-critical-7d',
    question: 'Show critical events in the last 7 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['critical', '7d', 'severity'],
  },
  {
    id: 'search-account-lockout-7d',
    question: 'Show account lockout events in the last 7 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['account_lockout', '7d'],
  },
  {
    id: 'search-malware-7d',
    question: 'Show malware detected events in the last 7 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['malware_detected', '7d', 'edr'],
  },
  {
    id: 'search-admin-failed-login-30d',
    question: 'Show failed login attempts by admin in the last 30 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['failed_login', 'admin', '30d'],
  },
  {
    id: 'search-firewall-cn-30d',
    question: 'Show firewall block events from China in the last 30 days',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['firewall_block', 'CN', '30d'],
  },
  {
    id: 'search-privesc-admin-30d',
    question: 'Show privilege escalation events by admin in the last 30 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['privilege_escalation', 'admin', '30d'],
  },
  {
    id: 'search-edr-7d',
    question: 'Show EDR events in the last 7 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['edr', '7d', 'source'],
  },
  {
    id: 'search-winauth-admin-24h',
    question: 'Show windows-auth events for admin in the last 24h',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['windows-auth', 'admin', '24h'],
  },
  {
    id: 'search-suspicious-outbound-finance-30d',
    question: 'Show suspicious outbound activity for finance.user in the last 30 days',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['suspicious_outbound', 'finance.user', '30d'],
  },

  // ─── Count Queries ──────────────────────────────────────────────────
  {
    id: 'count-all-24h',
    question: 'Count all events in the last 24 hours',
    categories: ['count'],
    badges: ['COUNT'],
    expectedView: 'number',
    tags: ['count', '24h'],
  },
  {
    id: 'count-critical-24h',
    question: 'Count critical events in the last 24h',
    categories: ['count'],
    badges: ['COUNT'],
    expectedView: 'number',
    tags: ['count', 'critical', '24h'],
  },
  {
    id: 'count-failed-login-7d',
    question: 'Count failed login events in the last 7 days',
    categories: ['count'],
    badges: ['COUNT'],
    expectedView: 'number',
    tags: ['count', 'failed_login', '7d'],
  },
  {
    id: 'count-account-lockout-7d',
    question: 'Count account lockout events in the last 7 days',
    categories: ['count'],
    badges: ['COUNT'],
    expectedView: 'number',
    tags: ['count', 'account_lockout', '7d'],
  },
  {
    id: 'count-malware-30d',
    question: 'Count malware detected events in the last 30 days',
    categories: ['count'],
    badges: ['COUNT'],
    expectedView: 'number',
    tags: ['count', 'malware_detected', '30d'],
  },
  {
    id: 'count-firewall-30d',
    question: 'Count firewall block events in the last 30 days',
    categories: ['count'],
    badges: ['COUNT'],
    expectedView: 'number',
    tags: ['count', 'firewall_block', '30d'],
  },
  {
    id: 'count-cn-24h',
    question: 'Count events from China in the last 24 hours',
    categories: ['count', 'multi_filter'],
    badges: ['COUNT', 'MULTI-FILTER'],
    expectedView: 'number',
    tags: ['count', 'CN', '24h'],
  },

  // ─── Group By / Bar Chart ──────────────────────────────────────────
  {
    id: 'bar-failed-login-by-user-7d',
    question: 'Count failed login attempts by user in the last 7 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['failed_login', 'user', '7d', 'group by'],
  },
  {
    id: 'bar-events-by-severity-24h',
    question: 'Group events by severity in the last 24h',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['severity', '24h', 'group by'],
  },
  {
    id: 'bar-events-by-type-7d',
    question: 'Group events by event type in the last 7 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['event_type', '7d', 'group by'],
  },
  {
    id: 'bar-events-by-country-30d',
    question: 'Group events by country code in the last 30 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['country_code', '30d', 'group by'],
  },
  {
    id: 'bar-events-by-host-30d',
    question: 'Group security events by host in the last 30 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['host', '30d', 'group by'],
  },
  {
    id: 'bar-lockout-by-user-7d',
    question: 'Group account lockout events by user in the last 7 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['account_lockout', 'user', '7d', 'group by'],
  },
  {
    id: 'bar-malware-by-host-30d',
    question: 'Group malware detected events by host in the last 30 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['malware_detected', 'host', '30d', 'group by'],
  },
  {
    id: 'bar-events-by-source-7d',
    question: 'Group events by source in the last 7 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['source', '7d', 'group by'],
  },
  {
    id: 'bar-cn-by-type-24h',
    question: 'Group China events by event type in the last 24 hours',
    categories: ['aggregation', 'bar_chart', 'multi_filter'],
    badges: ['AGGREGATION', 'BAR', 'MULTI-FILTER'],
    expectedView: 'bar_chart',
    tags: ['CN', 'event_type', '24h', 'group by'],
  },

  // ─── Top N ──────────────────────────────────────────────────────────
  {
    id: 'topn-source-ips-30d',
    question: 'Show the top 5 source IPs with the most events in the last 30 days',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['ip', '30d', 'top 5'],
  },
  {
    id: 'topn-3-source-ips-12d',
    question: 'Show the top 3 source IPs with the most alerts in the last 12 days',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['ip', '12d', 'top 3'],
  },
  {
    id: 'topn-users-30d',
    question: 'Show the top 5 users with the most events in the last 30 days',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['user', '30d', 'top 5'],
  },
  {
    id: 'topn-hosts-30d',
    question: 'Show the top 5 hosts with the most events in the last 30 days',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['host', '30d', 'top 5'],
  },
  {
    id: 'topn-countries-30d',
    question: 'Show the top 5 countries with the most events in the last 30 days',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['country_code', '30d', 'top 5'],
  },
  {
    id: 'topn-event-types-30d',
    question: 'Show the top 5 event types in the last 30 days',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['event_type', '30d', 'top 5'],
  },
  {
    id: 'topn-cn-event-types-24h',
    question: 'Show the top 5 event types from China in the last 24 hours',
    categories: ['top_n', 'bar_chart', 'multi_filter'],
    badges: ['TOP N', 'BAR', 'MULTI-FILTER'],
    expectedView: 'bar_chart',
    tags: ['event_type', 'CN', '24h', 'top 5'],
  },
  {
    id: 'topn-failed-login-ips-7d',
    question: 'Show the top 5 source IPs for failed login events in the last 7 days',
    categories: ['top_n', 'bar_chart', 'multi_filter'],
    badges: ['TOP N', 'BAR', 'MULTI-FILTER'],
    expectedView: 'bar_chart',
    tags: ['ip', 'failed_login', '7d', 'top 5'],
  },

  // ─── Time Series / Line Chart ──────────────────────────────────────
  {
    id: 'line-events-by-hour-24h',
    question: 'Show events by hour in the last 24h',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['date_histogram', '24h', 'trend'],
  },
  {
    id: 'line-failed-login-trend-24h',
    question: 'Show failed login trend by hour in the last 24h',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['failed_login', '24h', 'trend'],
  },
  {
    id: 'line-critical-trend-24h',
    question: 'Show critical event trend by hour in the last 24h',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['critical', '24h', 'trend'],
  },
  {
    id: 'line-firewall-trend-24h',
    question: 'Show firewall block trend by hour in the last 24h',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['firewall_block', '24h', 'trend'],
  },
  {
    id: 'line-malware-trend-24h',
    question: 'Show malware detected events by hour in the last 24h',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['malware_detected', '24h', 'trend'],
  },
  {
    id: 'line-events-12h',
    question: 'Show events by hour in the last 12 hours',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['date_histogram', '12h', 'trend'],
  },
  {
    id: 'line-events-36h',
    question: 'Show events by hour in the last 36 hours',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['date_histogram', '36h', 'trend'],
  },

  // ─── Multi-filter (entity) ─────────────────────────────────────────
  {
    id: 'multi-user-failed-login-24h',
    question: 'Find failed login events for admin or vpn.user in the last 24 hours',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['failed_login', 'admin', 'vpn.user', '24h', 'multi-value'],
  },
  {
    id: 'multi-user-cn-failed-login-24h',
    question: 'Show failed login events for admin or finance.user from China in the last 24 hours',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['failed_login', 'admin', 'finance.user', 'CN', '24h'],
  },
  {
    id: 'multi-user-lockout-7d',
    question: 'Show account lockout events for admin or vpn.user in the last 7 days',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['account_lockout', 'admin', 'vpn.user', '7d'],
  },
  {
    id: 'multi-source-24h',
    question: 'Show windows-auth or vpn events in the last 24 hours',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['windows-auth', 'vpn', '24h', 'multi-source'],
  },
  {
    id: 'multi-host-24h',
    question: 'Show events from host vpn-gw-01 or dc-01 in the last 24 hours',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['vpn-gw-01', 'dc-01', '24h', 'multi-host'],
  },
  {
    id: 'multi-ip-30d',
    question: 'Find activity from IP 203.0.113.45 or 198.51.100.200 in the last 30 days',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['203.0.113.45', '198.51.100.200', '30d', 'multi-ip'],
  },
  {
    id: 'multi-host-malware-30d',
    question: 'Show malware detected events on endpoint-014 or endpoint-023 in the last 30 days',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['malware_detected', 'endpoint-014', 'endpoint-023', '30d'],
  },
  {
    id: 'multi-source-edr-proxy-30d',
    question: 'Show EDR or proxy events in the last 30 days',
    categories: ['search', 'multi_filter'],
    badges: ['SEARCH', 'MULTI-FILTER'],
    expectedView: 'event_logs_table',
    tags: ['edr', 'proxy', '30d', 'multi-source'],
  },

  // ─── Multi-filter Chart Queries ────────────────────────────────────
  {
    id: 'multi-user-bar-ip-24h',
    question: 'Group failed login events for admin or vpn.user by source IP in the last 24 hours',
    categories: ['aggregation', 'bar_chart', 'multi_filter'],
    badges: ['AGGREGATION', 'BAR', 'MULTI-FILTER'],
    expectedView: 'bar_chart',
    tags: ['failed_login', 'admin', 'vpn.user', 'ip', '24h'],
  },
  {
    id: 'multi-source-bar-type-24h',
    question: 'Group windows-auth or vpn events by event type in the last 24 hours',
    categories: ['aggregation', 'bar_chart', 'multi_filter'],
    badges: ['AGGREGATION', 'BAR', 'MULTI-FILTER'],
    expectedView: 'bar_chart',
    tags: ['windows-auth', 'vpn', 'event_type', '24h'],
  },
  {
    id: 'multi-ip-topn-users-30d',
    question: 'Show the top 5 users from IP 203.0.113.45 or 198.51.100.200 in the last 30 days',
    categories: ['top_n', 'bar_chart', 'multi_filter'],
    badges: ['TOP N', 'BAR', 'MULTI-FILTER'],
    expectedView: 'bar_chart',
    tags: ['user', '203.0.113.45', '198.51.100.200', '30d', 'top 5'],
  },
  {
    id: 'multi-host-count-24h',
    question: 'Count events from host vpn-gw-01 or dc-01 in the last 24 hours',
    categories: ['count', 'multi_filter'],
    badges: ['COUNT', 'MULTI-FILTER'],
    expectedView: 'number',
    tags: ['vpn-gw-01', 'dc-01', '24h', 'count'],
  },
  {
    id: 'multi-source-count-30d',
    question: 'Count EDR or proxy events in the last 30 days',
    categories: ['count', 'multi_filter'],
    badges: ['COUNT', 'MULTI-FILTER'],
    expectedView: 'number',
    tags: ['edr', 'proxy', '30d', 'count'],
  },
  {
    id: 'multi-user-line-trend-24h',
    question: 'Show failed login trend by hour for admin or vpn.user in the last 24 hours',
    categories: ['time_series', 'line_chart', 'multi_filter'],
    badges: ['LINE', 'TIME SERIES', 'MULTI-FILTER'],
    expectedView: 'line_chart',
    tags: ['failed_login', 'admin', 'vpn.user', '24h', 'trend'],
  },
  {
    id: 'multi-failed-login-by-user-7d',
    question: 'Group failed login events by user in the last 7 days',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR', 'GROUP BY'],
    expectedView: 'bar_chart',
    tags: ['failed_login', 'user', '7d', 'group by'],
  },

  // ─── SOC Playbooks ─────────────────────────────────────────────────
  {
    id: 'playbook-brute-force-cn-24h',
    question: 'Investigate possible brute force activity from China in the last 24h',
    categories: ['playbook', 'search'],
    badges: ['PLAYBOOK', 'SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['brute force', 'CN', '24h', 'investigation'],
  },
  {
    id: 'playbook-privesc-admin-30d',
    question: 'Investigate privilege escalation activity by admin in the last 30 days',
    categories: ['playbook', 'search'],
    badges: ['PLAYBOOK', 'SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['privilege_escalation', 'admin', '30d', 'investigation'],
  },
  {
    id: 'playbook-malware-edr-7d',
    question: 'Investigate malware detected by EDR in the last 7 days',
    categories: ['playbook', 'search'],
    badges: ['PLAYBOOK', 'SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['malware_detected', 'edr', '7d', 'investigation'],
  },
  {
    id: 'playbook-data-exfil-finance-30d',
    question: 'Investigate suspicious outbound and large transfer activity from finance.user in the last 30 days',
    categories: ['playbook', 'search'],
    badges: ['PLAYBOOK', 'SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['suspicious_outbound', 'large_transfer', 'finance.user', '30d', 'investigation'],
  },
  {
    id: 'playbook-firewall-ips-30d',
    question: 'Investigate firewall blocks from suspicious source IPs in the last 30 days',
    categories: ['playbook', 'search'],
    badges: ['PLAYBOOK', 'SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['firewall_block', 'ip', '30d', 'investigation'],
  },
  {
    id: 'playbook-lockout-after-failed-7d',
    question: 'Investigate account lockouts after failed logins in the last 7 days',
    categories: ['playbook', 'search'],
    badges: ['PLAYBOOK', 'SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['account_lockout', 'failed_login', '7d', 'investigation'],
  },

  // ─── Vietnamese Demo ───────────────────────────────────────────────
  {
    id: 'vi-events-by-hour-24h',
    question: 'Số event theo giờ trong 24h qua',
    categories: ['time_series', 'line_chart', 'aggregation'],
    badges: ['AGGREGATION', 'LINE', 'TIME SERIES'],
    expectedView: 'line_chart',
    tags: ['vietnamese', '24h', 'trend'],
  },
  {
    id: 'vi-top-ip-30d',
    question: 'Top 5 IP có nhiều event nhất tháng này',
    categories: ['top_n', 'bar_chart'],
    badges: ['TOP N', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['vietnamese', 'ip', '30d', 'top 5'],
  },
  {
    id: 'vi-lockout-7d',
    question: 'Tìm account lockout trong 7 ngày qua',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['vietnamese', 'account_lockout', '7d'],
  },
  {
    id: 'vi-critical-7d',
    question: 'Tìm sự kiện critical trong 7 ngày qua',
    categories: ['search'],
    badges: ['SEARCH'],
    expectedView: 'event_logs_table',
    tags: ['vietnamese', 'critical', '7d'],
  },
  {
    id: 'vi-failed-login-by-user-7d',
    question: 'Đếm số lần login thất bại theo từng user trong 7 ngày qua',
    categories: ['aggregation', 'bar_chart'],
    badges: ['AGGREGATION', 'BAR'],
    expectedView: 'bar_chart',
    tags: ['vietnamese', 'failed_login', 'user', '7d'],
  },
]
