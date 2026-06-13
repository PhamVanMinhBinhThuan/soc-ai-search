import type {
  AggregationResultItemDto,
  SearchEventDto,
  SearchMode,
  SearchPlanDto,
} from '@/types/soc'

export function formatTimeRangeLabel(searchPlan: SearchPlanDto) {
  const timestamp = searchPlan.filters.timestamp

  if (!timestamp) {
    return 'All Time'
  }

  const relativeLabels: Record<string, string> = {
    'now-24h': 'Last 24 Hours',
    'now-7d': 'Last 7 Days',
    'now-30d': 'Last 30 Days',
  }

  if (timestamp.to === 'now' && relativeLabels[timestamp.from]) {
    return relativeLabels[timestamp.from]
  }

  return `${timestamp.from} to ${timestamp.to}`
}

function csvCell(value: string | number) {
  const text = String(value)
  const formulaSafeText = /^[=+\-@]/.test(text) ? `'${text}` : text

  return `"${formulaSafeText.replaceAll('"', '""')}"`
}

export function downloadMockCsv({
  mode,
  events,
  aggregationResults,
}: {
  mode: SearchMode
  events: SearchEventDto[]
  aggregationResults: AggregationResultItemDto[]
}) {
  const rows =
    mode === 'search'
      ? [
          [
            'event_id',
            'timestamp',
            'source',
            'severity',
            'event_type',
            'user',
            'host',
            'ip',
            'country_code',
            'message',
          ],
          ...events.map((event) => [
            event.event_id,
            event.timestamp,
            event.source,
            event.severity,
            event.event_type,
            event.user,
            event.host,
            event.ip,
            event.country_code,
            event.message,
          ]),
        ]
      : [
          ['key', 'value'],
          ...aggregationResults.map((item) => [item.key, item.value]),
        ]

  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `soc-ai-${mode}-mock.csv`
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
