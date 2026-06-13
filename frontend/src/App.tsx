import { Activity, Circle, FlaskConical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { EventDetailDrawer } from '@/components/soc/event-detail-drawer'
import { MetricsSummary } from '@/components/soc/metrics-summary'
import { QueryTransparency } from '@/components/soc/query-transparency'
import {
  ResultTabs,
  type ResultTab,
} from '@/components/soc/result-tabs'
import { SearchSection } from '@/components/soc/search-section'
import {
  SearchEmptyState,
  SearchErrorState,
  SearchIdleState,
  SearchLoadingState,
} from '@/components/soc/search-status'
import { SocSidebar } from '@/components/soc/soc-sidebar'
import { initialScenario, mockScenarios } from '@/lib/mock-data'
import { formatTimeRangeLabel } from '@/lib/mock-presentation'
import { ApiError } from '@/services/api-client'
import {
  initialMockResponse,
  mockSummaryForQuestion,
} from '@/services/mock-search-api'
import {
  getEventDetail,
  isMockMode,
  searchEvents,
} from '@/services/search-api'
import type {
  DetailStatus,
  EventDetailResponseDto,
  NaturalLanguageSearchRequestDto,
  NaturalLanguageSearchResponseDto,
  RequestStatus,
  UiError,
} from '@/types/soc'

const initialResponse = isMockMode ? initialMockResponse() : null
const initialRequest: NaturalLanguageSearchRequestDto | null = initialResponse
  ? {
      question: initialResponse.original_question,
      page: initialResponse.page,
      size: initialResponse.size,
    }
  : null

function toUiError(error: unknown): UiError {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      message: error.message,
      errors: error.errors,
    }
  }

  return {
    status: 0,
    message: 'An unexpected client error occurred',
    errors: [],
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function App() {
  const [question, setQuestion] = useState(
    isMockMode ? initialScenario.question : '',
  )
  const [submittedRequest, setSubmittedRequest] =
    useState<NaturalLanguageSearchRequestDto | null>(initialRequest)
  const [response, setResponse] =
    useState<NaturalLanguageSearchResponseDto | null>(initialResponse)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(
    initialResponse ? 'success' : 'idle',
  )
  const [searchError, setSearchError] = useState<UiError | null>(null)
  const [activeTab, setActiveTab] = useState<ResultTab>(
    initialResponse?.mode === 'aggregation' ? 'analytics' : 'raw',
  )

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventDetail, setEventDetail] =
    useState<EventDetailResponseDto | null>(null)
  const [detailStatus, setDetailStatus] =
    useState<DetailStatus>('idle')
  const [detailError, setDetailError] = useState<UiError | null>(null)

  const searchAbortRef = useRef<AbortController | null>(null)
  const detailAbortRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      searchAbortRef.current?.abort()
      detailAbortRef.current?.abort()
    },
    [],
  )

  const closeDetail = () => {
    detailAbortRef.current?.abort()
    detailAbortRef.current = null
    setDetailOpen(false)
    setSelectedEventId(null)
    setEventDetail(null)
    setDetailError(null)
    setDetailStatus('idle')
  }

  const executeSearch = async (
    request: NaturalLanguageSearchRequestDto,
  ) => {
    const normalizedRequest = {
      ...request,
      question: request.question.trim(),
    }

    if (!normalizedRequest.question) {
      setResponse(null)
      setSubmittedRequest(normalizedRequest)
      setSearchError({
        status: 400,
        message: 'Question must not be blank',
        errors: [],
      })
      setRequestStatus('error')
      return
    }

    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    closeDetail()
    setQuestion(normalizedRequest.question)
    setSubmittedRequest(normalizedRequest)
    setResponse(null)
    setSearchError(null)
    setRequestStatus('loading')

    try {
      const nextResponse = await searchEvents(
        normalizedRequest,
        controller.signal,
      )
      if (controller.signal.aborted) {
        return
      }

      setResponse(nextResponse)
      setActiveTab(
        nextResponse.mode === 'aggregation' ? 'analytics' : 'raw',
      )
      const isEmpty =
        nextResponse.mode === 'search'
          ? nextResponse.events.length === 0
          : nextResponse.aggregation_results.length === 0
      setRequestStatus(isEmpty ? 'empty' : 'success')
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      setResponse(null)
      setSearchError(toUiError(error))
      setRequestStatus('error')
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null
      }
    }
  }

  const loadEventDetail = async (eventId: string) => {
    detailAbortRef.current?.abort()
    const controller = new AbortController()
    detailAbortRef.current = controller
    setEventDetail(null)
    setDetailError(null)
    setDetailStatus('loading')

    try {
      const detail = await getEventDetail(eventId, controller.signal)
      if (controller.signal.aborted) {
        return
      }
      setEventDetail(detail)
      setDetailStatus('success')
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      setDetailError(toUiError(error))
      setDetailStatus('error')
    } finally {
      if (detailAbortRef.current === controller) {
        detailAbortRef.current = null
      }
    }
  }

  const openEventDetail = (eventId: string) => {
    setSelectedEventId(eventId)
    setDetailOpen(true)
    void loadEventDetail(eventId)
  }

  const submitQuestion = (nextQuestion: string) => {
    void executeSearch({
      question: nextQuestion,
      page: 0,
      size: response?.size ?? submittedRequest?.size ?? 20,
    })
  }

  const changePage = (page: number) => {
    if (!response || response.mode !== 'search') {
      return
    }
    void executeSearch({
      question: response.original_question,
      page,
      size: response.size,
    })
  }

  const retrySearch = () => {
    if (submittedRequest) {
      void executeSearch(submittedRequest)
    }
  }

  const retryEventDetail = () => {
    if (selectedEventId) {
      void loadEventDetail(selectedEventId)
    }
  }

  const mockSummary =
    isMockMode && response
      ? mockSummaryForQuestion(response.original_question)
      : null
  const timeRangeLabel = response
    ? formatTimeRangeLabel(response.search_plan)
    : 'All Time'

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
            {response ? (
              <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <Activity className="size-4 text-cyan-300" />
                {response.total.toLocaleString('en-US')} events
              </span>
            ) : null}
            <span
              className={
                isMockMode
                  ? 'hidden items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-medium text-cyan-300 sm:inline-flex'
                  : 'hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300 sm:inline-flex'
              }
            >
              <Circle className="size-2 fill-current" />
              {isMockMode ? 'Mock Dataset' : 'Backend API'}
            </span>
            {isMockMode ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-200 lg:inline-flex">
                <FlaskConical className="size-3" />
                No API calls
              </span>
            ) : null}
          </div>
        </header>

        <main className="mx-auto flex min-w-0 w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6">
          <SearchSection
            question={question}
            scenarios={mockScenarios}
            isLoading={requestStatus === 'loading'}
            isMockMode={isMockMode}
            onQuestionChange={setQuestion}
            onSubmitQuestion={submitQuestion}
            onSelectSuggestion={submitQuestion}
          />

          {requestStatus === 'idle' ? (
            <SearchIdleState isMock={isMockMode} />
          ) : null}

          {requestStatus === 'loading' ? <SearchLoadingState /> : null}

          {requestStatus === 'error' && searchError ? (
            <SearchErrorState
              error={searchError}
              onRetry={retrySearch}
            />
          ) : null}

          {response ? (
            <>
              <MetricsSummary
                mode={response.mode}
                total={response.total}
                llmLatencyMs={response.llm_latency_ms}
                searchLatencyMs={response.search_latency_ms}
                summary={mockSummary}
              />

              <QueryTransparency
                searchPlan={response.search_plan}
                generatedDsl={response.generated_dsl}
              />

              {requestStatus === 'empty' ? (
                <SearchEmptyState mode={response.mode} />
              ) : (
                <ResultTabs
                  mode={response.mode}
                  activeTab={activeTab}
                  events={response.events}
                  aggregationResults={response.aggregation_results}
                  chartMetadata={response.chart_metadata}
                  summary={mockSummary}
                  total={response.total}
                  page={response.page}
                  size={response.size}
                  totalPages={response.total_pages}
                  isMockMode={isMockMode}
                  timeRangeLabel={timeRangeLabel}
                  onTabChange={setActiveTab}
                  onPageChange={changePage}
                  onSelectEvent={openEventDetail}
                />
              )}
            </>
          ) : null}
        </main>
      </div>

      <EventDetailDrawer
        event={eventDetail}
        status={detailStatus}
        error={detailError}
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDetail()
          }
        }}
        onRetry={retryEventDetail}
      />
    </div>
  )
}

export default App
