import { Activity, Circle, FlaskConical } from 'lucide-react'
import { useState } from 'react'

import { EventDetailDrawer } from '@/components/soc/event-detail-drawer'
import { MetricsSummary } from '@/components/soc/metrics-summary'
import { QueryTransparency } from '@/components/soc/query-transparency'
import {
  ResultTabs,
  type ResultTab,
} from '@/components/soc/result-tabs'
import { SearchSection } from '@/components/soc/search-section'
import { SocSidebar } from '@/components/soc/soc-sidebar'
import {
  initialScenario,
  mockEventDetails,
  mockScenarios,
} from '@/lib/mock-data'
import { formatTimeRangeLabel } from '@/lib/mock-presentation'
import type {
  AggregationResultItemDto,
  ChartMetadataDto,
  EventDetailResponseDto,
  MockScenario,
  SearchEventDto,
  SearchMode,
  SearchPlanDto,
} from '@/types/soc'

function App() {
  const [question, setQuestion] = useState(initialScenario.question)
  const [mode, setMode] = useState<SearchMode>(initialScenario.mode)
  const [events, setEvents] = useState<SearchEventDto[]>(
    initialScenario.events,
  )
  const [aggregationResults, setAggregationResults] = useState<
    AggregationResultItemDto[]
  >(initialScenario.aggregation_results)
  const [searchPlan, setSearchPlan] = useState<SearchPlanDto>(
    initialScenario.search_plan,
  )
  const [generatedDsl, setGeneratedDsl] = useState<Record<string, unknown>>(
    initialScenario.generated_dsl,
  )
  const [chartMetadata, setChartMetadata] = useState<
    ChartMetadataDto | undefined
  >(initialScenario.chart_metadata)
  const [total, setTotal] = useState(initialScenario.total)
  const [llmLatencyMs, setLlmLatencyMs] = useState(
    initialScenario.llm_latency_ms,
  )
  const [searchLatencyMs, setSearchLatencyMs] = useState(
    initialScenario.search_latency_ms,
  )
  const [summary, setSummary] = useState(initialScenario.summary)
  const [activeTab, setActiveTab] = useState<ResultTab>(
    initialScenario.mode === 'aggregation' ? 'analytics' : 'raw',
  )
  const [selectedEvent, setSelectedEvent] =
    useState<EventDetailResponseDto | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const timeRangeLabel = formatTimeRangeLabel(searchPlan)

  const selectScenario = (scenario: MockScenario) => {
    setQuestion(scenario.question)
    setMode(scenario.mode)
    setEvents(scenario.events)
    setAggregationResults(scenario.aggregation_results)
    setSearchPlan(scenario.search_plan)
    setGeneratedDsl(scenario.generated_dsl)
    setChartMetadata(scenario.chart_metadata)
    setTotal(scenario.total)
    setLlmLatencyMs(scenario.llm_latency_ms)
    setSearchLatencyMs(scenario.search_latency_ms)
    setSummary(scenario.summary)
    setActiveTab(scenario.mode === 'aggregation' ? 'analytics' : 'raw')
    setDetailOpen(false)
  }

  const openEventDetail = (eventId: string) => {
    setSelectedEvent(mockEventDetails[eventId] ?? null)
    setDetailOpen(true)
  }

  return (
    <div className="dark flex min-h-svh bg-background text-foreground">
      <SocSidebar />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center gap-3 overflow-hidden border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">Event Search</h1>
            <p className="truncate text-xs text-muted-foreground">
              AI-powered investigation console
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <Activity className="size-4 text-cyan-300" />
              {total.toLocaleString('en-US')} events
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-300 sm:inline-flex">
              <Circle className="size-2 fill-current" />
              Mock Dataset
            </span>
            <span className="hidden items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200 lg:inline-flex">
              <FlaskConical className="size-3" />
              No API calls
            </span>
          </div>
        </header>

        <main className="mx-auto flex min-w-0 w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6">
          <SearchSection
            question={question}
            scenarios={mockScenarios}
            onQuestionChange={setQuestion}
            onSelectScenario={selectScenario}
          />

          <MetricsSummary
            mode={mode}
            total={total}
            llmLatencyMs={llmLatencyMs}
            searchLatencyMs={searchLatencyMs}
            summary={summary}
          />

          <QueryTransparency
            searchPlan={searchPlan}
            generatedDsl={generatedDsl}
          />

          <ResultTabs
            mode={mode}
            activeTab={activeTab}
            events={events}
            aggregationResults={aggregationResults}
            chartMetadata={chartMetadata}
            summary={summary}
            total={total}
            timeRangeLabel={timeRangeLabel}
            onTabChange={setActiveTab}
            onSelectEvent={openEventDetail}
          />
        </main>
      </div>

      <EventDetailDrawer
        event={selectedEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}

export default App
