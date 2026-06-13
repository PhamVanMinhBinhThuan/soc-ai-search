import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  Download,
  FileSearch,
  Table2,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'

import { CountryCode } from '@/components/soc/country-code'
import { SeverityBadge } from '@/components/soc/severity-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { downloadMockCsv } from '@/lib/mock-presentation'
import type {
  AggregationResultItemDto,
  ChartMetadataDto,
  SearchEventDto,
  SearchMode,
} from '@/types/soc'

type ResultTab = 'analytics' | 'raw'

const AggregationChart = lazy(() =>
  import('@/components/soc/aggregation-chart').then((module) => ({
    default: module.AggregationChart,
  })),
)

function EmptyModeState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BarChart3
  title: string
  description: string
}) {
  return (
    <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-border bg-background/25 p-8 text-center">
      <div>
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}

function AnalyticsView({
  aggregationResults,
  chartMetadata,
  summary,
}: {
  aggregationResults: AggregationResultItemDto[]
  chartMetadata: ChartMetadataDto | null
  summary: string | null
}) {
  if (aggregationResults.length === 0) {
    return (
      <EmptyModeState
        icon={BarChart3}
        title="No aggregation buckets"
        description="The aggregation completed without returning any matching buckets."
      />
    )
  }

  return (
    <div className="space-y-4">
      {summary ? (
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 px-4 py-3">
          <p className="text-xs leading-5 text-foreground/80">{summary}</p>
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="h-80 animate-pulse rounded-xl border border-border bg-secondary/20" />
        }
      >
        <AggregationChart
          data={aggregationResults}
          metadata={chartMetadata ?? undefined}
        />
      </Suspense>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/25 px-4 py-3">
          <Table2 className="size-4 text-cyan-300" />
          <h3 className="text-sm font-semibold">Summary Table</h3>
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {aggregationResults.length} buckets
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{chartMetadata?.x_axis_label ?? 'Key'}</TableHead>
              <TableHead className="text-right">
                {chartMetadata?.y_axis_label ?? 'Value'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregationResults.map((item) => (
              <TableRow key={item.key}>
                <TableCell className="font-mono text-xs">{item.key}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-cyan-300">
                  {item.value.toLocaleString('en-US')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function RawEventsView({
  events,
  total,
  page,
  size,
  totalPages,
  onPageChange,
  onSelectEvent,
}: {
  events: SearchEventDto[]
  total: number
  page: number
  size: number
  totalPages: number
  onPageChange: (page: number) => void
  onSelectEvent: (eventId: string) => void
}) {
  if (events.length === 0) {
    return (
      <EmptyModeState
        icon={FileSearch}
        title="No matching events"
        description="The search completed successfully, but no raw events matched the validated SearchPlan."
      />
    )
  }

  const firstResult = page * size + 1
  const lastResult = Math.min(page * size + events.length, total)

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/25 px-4 py-3">
        <Table2 className="size-4 text-cyan-300" />
        <h3 className="text-sm font-semibold">Raw Events</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {total.toLocaleString('en-US')} results
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="min-w-64">Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow
              key={event.event_id}
              tabIndex={0}
              aria-label={`Open event ${event.event_id}`}
              className="cursor-pointer focus-visible:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50"
              onClick={() => onSelectEvent(event.event_id)}
              onKeyDown={(eventKey) => {
                if (
                  eventKey.key === 'Enter' ||
                  eventKey.key === ' '
                ) {
                  eventKey.preventDefault()
                  onSelectEvent(event.event_id)
                }
              }}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.timestamp.replace('T', ' ').replace('Z', '')}
              </TableCell>
              <TableCell>
                <SeverityBadge severity={event.severity} />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {event.source}
              </TableCell>
              <TableCell>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs">
                  {event.event_type}
                </span>
              </TableCell>
              <TableCell>{event.user}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {event.host}
              </TableCell>
              <TableCell className="font-mono text-xs">{event.ip}</TableCell>
              <TableCell>
                <CountryCode code={event.country_code} />
              </TableCell>
              <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                {event.message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Showing <span className="font-mono text-foreground">{firstResult}</span>
          {' - '}
          <span className="font-mono text-foreground">{lastResult}</span>
          {' of '}
          <span className="font-mono text-foreground">
            {total.toLocaleString('en-US')}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            Page {page + 1} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous result page"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next result page"
            disabled={page + 1 >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ResultTabs({
  mode,
  activeTab,
  events,
  aggregationResults,
  chartMetadata,
  summary,
  total,
  page,
  size,
  totalPages,
  isMockMode,
  timeRangeLabel,
  onTabChange,
  onPageChange,
  onSelectEvent,
}: {
  mode: SearchMode
  activeTab: ResultTab
  events: SearchEventDto[]
  aggregationResults: AggregationResultItemDto[]
  chartMetadata: ChartMetadataDto | null
  summary: string | null
  total: number
  page: number
  size: number
  totalPages: number
  isMockMode: boolean
  timeRangeLabel: string
  onTabChange: (tab: ResultTab) => void
  onPageChange: (page: number) => void
  onSelectEvent: (eventId: string) => void
}) {
  const [exported, setExported] = useState(false)
  const hasExportData =
    mode === 'search' ? events.length > 0 : aggregationResults.length > 0

  const exportCsv = () => {
    downloadMockCsv({ mode, events, aggregationResults })
    setExported(true)
    window.setTimeout(() => setExported(false), 1400)
  }

  return (
    <Card className="gap-0 overflow-hidden border border-border bg-card py-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-background/40 px-3 text-xs text-foreground">
          <CalendarDays className="size-4" />
          {timeRangeLabel}
        </span>
        <span className="rounded-lg border border-border bg-background/35 px-3 py-1.5 text-xs text-muted-foreground">
          Mode: <strong className="text-foreground">{mode}</strong>
        </span>
        {isMockMode ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={!hasExportData}
            onClick={exportCsv}
            aria-live="polite"
          >
            {exported ? <Check className="text-emerald-300" /> : <Download />}
            {exported ? 'Exported' : 'Export Mock CSV'}
          </Button>
        ) : null}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as ResultTab)}
        className="p-3 sm:p-4"
      >
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="analytics" disabled={mode !== 'aggregation'}>
            <BarChart3 />
            Analytics View
          </TabsTrigger>
          <TabsTrigger value="raw" disabled={mode !== 'search'}>
            <DatabaseZap />
            Raw Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <AnalyticsView
            aggregationResults={aggregationResults}
            chartMetadata={chartMetadata}
            summary={summary}
          />
        </TabsContent>
        <TabsContent value="raw">
          <RawEventsView
            events={events}
            total={total}
            page={page}
            size={size}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onSelectEvent={onSelectEvent}
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}

export type { ResultTab }
