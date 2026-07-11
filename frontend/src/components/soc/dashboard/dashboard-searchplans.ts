import type { SearchPlanDto } from '@/types/soc'

export const dashboardSearchPlans = {
  failedLogins: {
    mode: 'search',
    page: 0,
    size: 1,
    message_query: null,
    aggregation: null,
    filters: {
      timestamp: { from: 'now-24h', to: 'now' },
      event_type: ['failed_login'],
    },
  },
  criticalHigh: {
    mode: 'search',
    page: 0,
    size: 1,
    message_query: null,
    aggregation: null,
    filters: {
      timestamp: { from: 'now-24h', to: 'now' },
      severity: ['critical', 'high'],
    },
  },
  eventsOverTime: {
    mode: 'aggregation',
    page: 0,
    size: 1,
    message_query: null,
    filters: { timestamp: { from: 'now-24h', to: 'now' } },
    aggregation: { type: 'date_histogram', interval: 'hour' },
  },
  severityDistribution: {
    mode: 'aggregation',
    page: 0,
    size: 1,
    message_query: null,
    filters: { timestamp: { from: 'now-24h', to: 'now' } },
    aggregation: { type: 'group_by', field: 'severity', top_n: 10 },
  },
  topSourceIps: {
    mode: 'aggregation',
    page: 0,
    size: 1,
    message_query: null,
    filters: { timestamp: { from: 'now-24h', to: 'now' } },
    aggregation: { type: 'top_n', field: 'ip', top_n: 5 },
  },
} satisfies Record<string, SearchPlanDto>
