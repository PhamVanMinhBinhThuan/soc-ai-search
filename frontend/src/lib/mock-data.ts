import type {
  EventDetailResponseDto,
  MockScenario,
  SearchEventDto,
} from '@/types/soc'

export const mockEvents: SearchEventDto[] = [
  {
    event_id: 'seed-42-1001',
    timestamp: '2026-06-13T08:42:16Z',
    source: 'windows-auth',
    severity: 'critical',
    event_type: 'privilege_escalation',
    user: 'admin',
    host: 'dc-prod-01',
    ip: '203.0.113.45',
    country_code: 'CN',
    message: 'Privilege escalation detected after repeated failed logins',
  },
  {
    event_id: 'seed-42-1002',
    timestamp: '2026-06-13T08:39:08Z',
    source: 'vpn',
    severity: 'high',
    event_type: 'failed_login',
    user: 'vpn.user',
    host: 'vpn-gw-01',
    ip: '203.0.113.45',
    country_code: 'CN',
    message: 'Brute force login pattern detected from repeated source IP',
  },
  {
    event_id: 'seed-42-1003',
    timestamp: '2026-06-13T08:35:44Z',
    source: 'edr',
    severity: 'critical',
    event_type: 'malware_detected',
    user: 'finance.user',
    host: 'fin-ws-07',
    ip: '198.51.100.27',
    country_code: 'US',
    message: 'Malware detected and suspicious binary quarantined',
  },
  {
    event_id: 'seed-42-1004',
    timestamp: '2026-06-13T08:31:21Z',
    source: 'firewall',
    severity: 'high',
    event_type: 'firewall_block',
    user: 'svc.backup',
    host: 'fw-edge-01',
    ip: '192.0.2.88',
    country_code: 'RU',
    message: 'Firewall block applied to suspicious outbound connection',
  },
  {
    event_id: 'seed-42-1005',
    timestamp: '2026-06-13T08:28:13Z',
    source: 'windows-auth',
    severity: 'medium',
    event_type: 'account_lockout',
    user: 'admin',
    host: 'dc-prod-01',
    ip: '203.0.113.45',
    country_code: 'CN',
    message: 'Account lockout triggered after multiple failed login attempts',
  },
  {
    event_id: 'seed-42-1006',
    timestamp: '2026-06-13T08:21:02Z',
    source: 'proxy',
    severity: 'high',
    event_type: 'suspicious_outbound',
    user: 'finance.user',
    host: 'fin-ws-07',
    ip: '198.51.100.66',
    country_code: 'SG',
    message: 'Suspicious outbound transfer to an uncommon destination',
  },
  {
    event_id: 'seed-42-1007',
    timestamp: '2026-06-13T08:12:49Z',
    source: 'dns',
    severity: 'low',
    event_type: 'dns_query',
    user: 'demo.user',
    host: 'dev-ws-03',
    ip: '192.0.2.17',
    country_code: 'VN',
    message: 'DNS query completed for approved corporate domain',
  },
  {
    event_id: 'seed-42-1008',
    timestamp: '2026-06-13T08:06:31Z',
    source: 'windows-auth',
    severity: 'medium',
    event_type: 'failed_login',
    user: 'root',
    host: 'srv-auth-02',
    ip: '198.51.100.73',
    country_code: 'DE',
    message: 'Failed login attempt due to invalid credentials',
  },
]

const rawLogFor = (event: SearchEventDto) =>
  JSON.stringify(
    {
      timestamp: event.timestamp,
      source: event.source,
      severity: event.severity,
      event_type: event.event_type,
      user: event.user,
      host: event.host,
      ip: event.ip,
      country_code: event.country_code,
      message: event.message,
      trace_id: `trace-${event.event_id}`,
    },
    null,
    2,
  )

export const mockEventDetails: Record<string, EventDetailResponseDto> =
  Object.fromEntries(
    mockEvents.map((event) => [
      event.event_id,
      {
        ...event,
        index_name: 'soc-events-v1',
        raw: rawLogFor(event),
      },
    ]),
  )

const failedLoginSearchEvents = mockEvents.filter((event) =>
  ['failed_login', 'account_lockout', 'privilege_escalation'].includes(
    event.event_type,
  ),
)

const criticalSearchEvents = mockEvents.filter(
  (event) => event.severity === 'critical',
)

export const mockScenarios: MockScenario[] = [
  {
    shortLabel: 'Failed login from China',
    question: 'Show me failed login attempts from China in the last 24h',
    mode: 'search',
    total: 312,
    llm_latency_ms: 118,
    search_latency_ms: 36,
    search_plan: {
      mode: 'search',
      filters: {
        timestamp: { from: 'now-24h', to: 'now' },
        event_type: ['failed_login'],
        country_code: ['CN'],
      },
      aggregation: null,
      message_query: null,
      page: 0,
      size: 20,
    },
    generated_dsl: {
      query: {
        bool: {
          filter: [
            { range: { timestamp: { gte: 'now-24h', lte: 'now' } } },
            { terms: { event_type: ['failed_login'] } },
            { terms: { country_code: ['CN'] } },
          ],
        },
      },
      from: 0,
      size: 20,
      sort: [{ timestamp: { order: 'desc' } }],
    },
    aggregation_results: [],
    events: failedLoginSearchEvents,
    summary:
      '312 failed login events matched the last 24 hours. The repeated source IP 203.0.113.45 appears across failed login, account lockout, and privilege escalation activity. Analysts should prioritize this source and review the affected privileged accounts.',
  },
  {
    shortLabel: 'Critical alerts',
    question: 'Tìm alert critical trong 7 ngày qua',
    mode: 'search',
    total: 337,
    llm_latency_ms: 96,
    search_latency_ms: 31,
    search_plan: {
      mode: 'search',
      filters: {
        timestamp: { from: 'now-7d', to: 'now' },
        severity: ['critical'],
      },
      aggregation: null,
      message_query: null,
      page: 0,
      size: 20,
    },
    generated_dsl: {
      query: {
        bool: {
          filter: [
            { range: { timestamp: { gte: 'now-7d', lte: 'now' } } },
            { terms: { severity: ['critical'] } },
          ],
        },
      },
      from: 0,
      size: 20,
      sort: [{ timestamp: { order: 'desc' } }],
    },
    aggregation_results: [],
    events: criticalSearchEvents,
    summary:
      '337 critical events were found in the last 7 days. The visible sample contains malware and privilege escalation activity that should be investigated first. Correlate the affected hosts and users before closing these alerts.',
  },
  {
    shortLabel: 'Failed login by user',
    question: 'Đếm số lần login thất bại theo từng user trong 7 ngày qua',
    mode: 'aggregation',
    total: 1240,
    llm_latency_ms: 124,
    search_latency_ms: 42,
    search_plan: {
      mode: 'aggregation',
      filters: {
        timestamp: { from: 'now-7d', to: 'now' },
        event_type: ['failed_login'],
      },
      aggregation: {
        type: 'group_by',
        field: 'user',
        top_n: 10,
      },
      message_query: null,
      page: 0,
      size: 20,
    },
    generated_dsl: {
      query: {
        bool: {
          filter: [
            { range: { timestamp: { gte: 'now-7d', lte: 'now' } } },
            { terms: { event_type: ['failed_login'] } },
          ],
        },
      },
      size: 0,
      aggs: {
        count_by_field: {
          terms: { field: 'user', size: 10 },
        },
      },
    },
    aggregation_type: 'group_by',
    aggregation_results: [
      { key: 'admin', value: 558 },
      { key: 'vpn.user', value: 241 },
      { key: 'svc.backup', value: 187 },
      { key: 'root', value: 142 },
      { key: 'finance.user', value: 112 },
    ],
    chart_metadata: {
      chart_type: 'BAR',
      x_axis_label: 'User',
      y_axis_label: 'Failed Logins',
    },
    events: [],
    summary:
      'Showing failed login counts grouped by user for the last 7 days. The admin account is the highest-volume target with 558 matching events. Review repeated source IPs and related account lockouts for the leading users.',
  },
  {
    shortLabel: 'Top source IPs',
    question: 'Top 10 IP có nhiều alert nhất tháng này',
    mode: 'aggregation',
    total: 2864,
    llm_latency_ms: 101,
    search_latency_ms: 47,
    search_plan: {
      mode: 'aggregation',
      filters: {
        timestamp: { from: 'now-30d', to: 'now' },
      },
      aggregation: {
        type: 'top_n',
        field: 'ip',
        top_n: 10,
      },
      message_query: null,
      page: 0,
      size: 20,
    },
    generated_dsl: {
      query: {
        bool: {
          filter: [
            { range: { timestamp: { gte: 'now-30d', lte: 'now' } } },
          ],
        },
      },
      size: 0,
      aggs: {
        top_values: {
          terms: { field: 'ip', size: 10 },
        },
      },
    },
    aggregation_type: 'top_n',
    aggregation_results: [
      { key: '203.0.113.45', value: 622 },
      { key: '198.51.100.27', value: 418 },
      { key: '192.0.2.88', value: 367 },
      { key: '198.51.100.66', value: 291 },
      { key: '198.51.100.73', value: 204 },
    ],
    chart_metadata: {
      chart_type: 'BAR',
      x_axis_label: 'Source IP',
      y_axis_label: 'Events',
    },
    events: [],
    summary:
      'Showing the highest-volume source IP addresses in the last 30 days. The leading source has 622 events and should be reviewed for repeated attack patterns. Compare these addresses with firewall blocks and authentication failures.',
  },
  {
    shortLabel: 'Events by hour',
    question: 'Số event theo giờ trong 24h qua',
    mode: 'aggregation',
    total: 1946,
    llm_latency_ms: 89,
    search_latency_ms: 39,
    search_plan: {
      mode: 'aggregation',
      filters: {
        timestamp: { from: 'now-24h', to: 'now' },
      },
      aggregation: {
        type: 'date_histogram',
        interval: 'hour',
      },
      message_query: null,
      page: 0,
      size: 20,
    },
    generated_dsl: {
      query: {
        bool: {
          filter: [
            { range: { timestamp: { gte: 'now-24h', lte: 'now' } } },
          ],
        },
      },
      size: 0,
      aggs: {
        events_over_time: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: '1h',
            order: { _key: 'asc' },
          },
        },
      },
    },
    aggregation_type: 'date_histogram',
    aggregation_results: [
      { key: '04:00', value: 92 },
      { key: '05:00', value: 118 },
      { key: '06:00', value: 154 },
      { key: '07:00', value: 207 },
      { key: '08:00', value: 264 },
      { key: '09:00', value: 231 },
      { key: '10:00', value: 188 },
      { key: '11:00', value: 173 },
    ],
    chart_metadata: {
      chart_type: 'LINE',
      x_axis_label: 'Time',
      y_axis_label: 'Events',
    },
    events: [],
    summary:
      'Event volume peaked between 08:00 and 09:00 UTC. The hourly trend can help analysts correlate alert bursts with authentication and endpoint activity. Investigate the peak window alongside critical severity events.',
  },
]

export const initialScenario = mockScenarios[2]!
