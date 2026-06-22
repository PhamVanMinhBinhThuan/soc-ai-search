import {
  LogOut,
  ScrollText,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  canEditSearchPlan,
  canExportCsv,
  canViewAuditLogs,
  canViewBasicEventDetail,
  canViewHistory,
  canViewRawLog,
} from '@/auth/permissions'
import { useSocAuth } from '@/auth/use-auth'
import { EventDetailDrawer } from '@/components/soc/event-detail-drawer'
import { HistorySheet } from '@/components/soc/history-sheet'
import { MetricsSummary } from '@/components/soc/metrics-summary'
import { QueryTransparency } from '@/components/soc/query-transparency'
import {
  ResultTabs,
  type ResultTab,
} from '@/components/soc/result-tabs'
import { SearchSection } from '@/components/soc/search-section'
import { AuditLogsPage } from '@/components/soc/admin/audit-logs-page'
import { InvestigationsPage } from '@/components/soc/investigations/investigations-page'
import { SocDashboard } from '@/components/soc/dashboard/soc-dashboard'
import {
  SearchErrorState,
  SearchIdleState,
  SearchLoadingState,
} from '@/components/soc/search-status'
import { SocHero } from '@/components/hero/soc-hero'
import { SocSidebar } from '@/components/soc/soc-sidebar'
import { Button } from '@/components/ui/button'
import { initialScenario, mockScenarios } from '@/lib/mock-data'
import {
  downloadMockCsv,
  formatTimeRangeLabel,
} from '@/lib/mock-presentation'
import { setAccessTokenProvider } from '@/services/api-client'
import { toUiError } from '@/services/api-error-messages'
import {
  downloadCsvBlob,
  exportSearchCsv,
} from '@/services/csv-export-api'
import { getSearchHistory, togglePinHistory } from '@/services/history-api'
import { initialMockResponse } from '@/services/mock-search-api'
import {
  getEventDetail,
  isMockMode,
  searchEvents,
} from '@/services/search-api'
import type {
  DetailStatus,
  EventDetailResponseDto,
  ExportStatus,
  HistoryStatus,
  NaturalLanguageSearchRequestDto,
  NaturalLanguageSearchResponseDto,
  RequestStatus,
  SearchHistoryItemDto,
  SearchHistoryPageDto,
  UiError,
} from '@/types/soc'

const DEFAULT_SEARCH_PAGE_SIZE = 10
const HISTORY_PAGE_SIZE = 5
const LOGOUT_BUTTON_CLASS =
  'border border-zinc-700/80 bg-zinc-900/40 text-zinc-300 shadow-[0_0_24px_-18px_rgba(34,211,238,0.9)] transition-all hover:border-cyan-400/60 hover:bg-cyan-400/10 hover:text-white hover:shadow-[0_0_30px_-16px_rgba(34,211,238,0.95)]'

const initialResponse = isMockMode ? initialMockResponse() : null
const initialRequest: NaturalLanguageSearchRequestDto | null = initialResponse
  ? {
      question: initialResponse.original_question,
      page: initialResponse.page,
      size: initialResponse.size,
    }
  : null

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function App() {
  const auth = useSocAuth()
  const permissionContext = {
    roles: auth.roles,
    loading: auth.loading,
  }
  const canUseSearch = canViewBasicEventDetail(permissionContext)
  const canUseHistory = canViewHistory(permissionContext)
  const canUseExport = canExportCsv(permissionContext)
  const canUseRawLog = canViewRawLog(permissionContext)
  const canEditPlan = canEditSearchPlan(permissionContext)
  const canUseAuditLogs = canViewAuditLogs(permissionContext)
  const [question, setQuestion] = useState(
    isMockMode ? initialScenario.question : '',
  )
  const [submittedRequest, setSubmittedRequest] =
    useState<NaturalLanguageSearchRequestDto | null>(initialRequest)
  const [response, setResponse] =
    useState<NaturalLanguageSearchResponseDto | null>(initialResponse)
  const [isCurrentQueryPinned, setIsCurrentQueryPinned] = useState(false)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(
    initialResponse ? 'success' : 'idle',
  )
  const [searchError, setSearchError] = useState<UiError | null>(null)
  const [activeTab, setActiveTab] = useState<ResultTab>(
    initialResponse?.mode === 'aggregation' ? 'analytics' : 'raw',
  )
  const [activePage, setActivePage] = useState<'dashboard' | 'search' | 'investigations' | 'audit-logs'>('search')

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventDetail, setEventDetail] =
    useState<EventDetailResponseDto | null>(null)
  const [detailStatus, setDetailStatus] =
    useState<DetailStatus>('idle')
  const [detailError, setDetailError] = useState<UiError | null>(null)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyResponse, setHistoryResponse] =
    useState<SearchHistoryPageDto | null>(null)
  const [historyStatus, setHistoryStatus] =
    useState<HistoryStatus>('idle')
  const [historyError, setHistoryError] = useState<UiError | null>(null)
  const [exportStatus, setExportStatus] =
    useState<ExportStatus>('idle')
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const searchAbortRef = useRef<AbortController | null>(null)
  const detailAbortRef = useRef<AbortController | null>(null)
  const historyAbortRef = useRef<AbortController | null>(null)
  const exportAbortRef = useRef<AbortController | null>(null)
  const historyOpenRef = useRef(false)
  const historyPageRef = useRef(0)

  useEffect(() => {
    setAccessTokenProvider(() => auth.accessToken)
    return () => setAccessTokenProvider(null)
  }, [auth.accessToken])

  useEffect(
    () => () => {
      searchAbortRef.current?.abort()
      detailAbortRef.current?.abort()
      historyAbortRef.current?.abort()
      exportAbortRef.current?.abort()
    },
    [],
  )

  const loadHistory = async (page: number) => {
    if (!canUseHistory) {
      setHistoryStatus('idle')
      setHistoryError({
        status: 403,
        message: 'You do not have permission to view search history.',
        errors: [],
      })
      return
    }

    historyAbortRef.current?.abort()
    const controller = new AbortController()
    historyAbortRef.current = controller
    setHistoryStatus('loading')
    setHistoryError(null)

    try {
      const nextHistory = await getSearchHistory(
        page,
        HISTORY_PAGE_SIZE,
        {},
        controller.signal,
      )
      if (controller.signal.aborted) {
        return
      }
      setHistoryResponse(nextHistory)
      setHistoryStatus(
        nextHistory.items.length === 0 ? 'empty' : 'success',
      )
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      setHistoryError(toUiError(error))
      setHistoryStatus('error')
    } finally {
      if (historyAbortRef.current === controller) {
        historyAbortRef.current = null
      }
    }
  }

  const handleTogglePinCurrentQuery = async (pinned: boolean) => {
    if (!response?.query_id) return
    setIsCurrentQueryPinned(pinned)
    try {
      await togglePinHistory(response.query_id, pinned)
      if (historyOpenRef.current && canUseHistory) {
        void loadHistory(historyPageRef.current)
      }
    } catch (e) {
      setIsCurrentQueryPinned(!pinned)
      console.error(e)
    }
  }

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
    exportAbortRef.current?.abort()
    exportAbortRef.current = null
    const controller = new AbortController()
    searchAbortRef.current = controller
    closeDetail()
    setQuestion(normalizedRequest.question)
    setSubmittedRequest(normalizedRequest)
    setResponse(null)
    setSearchError(null)
    setExportStatus('idle')
    setExportMessage(null)
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
      setIsCurrentQueryPinned(false)
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
      if (
        !controller.signal.aborted &&
        historyOpenRef.current &&
        canUseHistory
      ) {
        void loadHistory(historyPageRef.current)
      }
    }
  }

  const loadEventDetail = async (eventId: string) => {
    if (!canUseSearch) {
      setEventDetail(null)
      setDetailError({
        status: 403,
        message: 'You do not have permission to view event details.',
        errors: [],
      })
      setDetailStatus('error')
      return
    }

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
      size: response?.size ?? submittedRequest?.size ?? DEFAULT_SEARCH_PAGE_SIZE,
    })
  }

  const changePage = async (page: number) => {
    if (!response || response.mode !== 'search') {
      return
    }

    searchAbortRef.current?.abort()
    exportAbortRef.current?.abort()
    exportAbortRef.current = null
    const controller = new AbortController()
    searchAbortRef.current = controller

    closeDetail()
    setSearchError(null)
    setExportStatus('idle')
    setExportMessage(null)
    // We don't set requestStatus to 'loading' to avoid unmounting the ResultTabs
    // ResultTabs shows a spinner internally or we can just let it be.
    // Actually, setting requestStatus = 'loading' shows SearchLoadingState and hides the table.
    // executeSearch does it, so let's keep consistent for now.
    setRequestStatus('loading')

    try {
      const { runSearchPlan } = await import('@/services/search-plan-api')
      const paginatedPlan = {
        ...response.search_plan,
        page,
        size: response.size,
      }
      const nextResponse = await runSearchPlan(paginatedPlan, controller.signal)
      if (controller.signal.aborted) {
        return
      }

      setResponse(nextResponse)
      setIsCurrentQueryPinned(false)
      setActiveTab(nextResponse.mode === 'aggregation' ? 'analytics' : 'raw')
      
      const isEmpty =
        nextResponse.mode === 'search'
          ? nextResponse.events.length === 0
          : nextResponse.aggregation_results.length === 0
      setRequestStatus(isEmpty ? 'empty' : 'success')
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      setSearchError(toUiError(error))
      setRequestStatus('error')
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null
      }
    }
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


  const runHistoryItem = (item: SearchHistoryItemDto) => {
    historyOpenRef.current = false
    setHistoryOpen(false)
    setQuestion(item.question)
    void executeSearch({
      question: item.question,
      page: 0,
      size: response?.size ?? submittedRequest?.size ?? DEFAULT_SEARCH_PAGE_SIZE,
    })
  }

  const navigateToAuditLogs = () => {
    setActivePage('audit-logs')
  }

  const handleExport = async (overrideQueryId?: string) => {
    const targetQueryId = overrideQueryId ?? response?.query_id
    if (!targetQueryId || !canUseExport) {
      return
    }

    exportAbortRef.current?.abort()
    const controller = new AbortController()
    exportAbortRef.current = controller
    setExportStatus('loading')
    setExportMessage(null)

    try {
      if (isMockMode) {
        if (!overrideQueryId && response) {
          downloadMockCsv({
            mode: response.mode,
            events: response.events,
            aggregationResults: response.aggregation_results,
          })
          setExportMessage('Mock CSV downloaded from local demo data.')
        } else {
          setExportMessage('Exporting historical query is not fully supported in pure mock mode.')
        }
      } else {
        const exported = await exportSearchCsv(
          targetQueryId,
          controller.signal,
        )
        if (controller.signal.aborted) {
          return
        }
        downloadCsvBlob(exported.blob, exported.filename)
        setExportMessage(
          exported.truncated
            ? 'The CSV contains the first 10,000 rows. The backend marked this export as truncated.'
            : `Downloaded ${exported.filename}.`,
        )
      }
      setExportStatus('success')
    } catch (error) {
      if (isAbortError(error)) {
        return
      }
      const uiError = toUiError(error)
      setExportStatus('error')
      setExportMessage(
        [uiError.message, ...uiError.errors].filter(Boolean).join(' '),
      )
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null
      }
    }
  }

  const timeRangeLabel = response
    ? formatTimeRangeLabel(response.search_plan)
    : 'All Time'

  const isLandingPage = !submittedRequest && !response

  return (
    <div className="dark flex min-h-svh bg-background text-foreground">
      {!isLandingPage ? (
        <SocSidebar
          identity={auth.email || auth.identity}
          roles={auth.roles}
          authLoading={auth.loading}
          authEnabled={auth.enabled}
          activePage={activePage}
          onPageChange={setActivePage}
          onOpenHistory={() => { setHistoryOpen(true); void loadHistory(0) }}
          onOpenAuditLogs={navigateToAuditLogs}
          onLogout={auth.signOut}
        />
      ) : null}

      {activePage === 'audit-logs' ? (
        canUseAuditLogs ? (
          <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
            <AuditLogsPage onBack={() => setActivePage('search')} />
          </div>
        ) : (
          <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh items-center justify-center bg-zinc-950 text-rose-500">
            <h1 className="text-2xl font-bold">403 Forbidden</h1>
            <p className="mt-2 text-zinc-400">You do not have permission to view System Audit Logs.</p>
            <Button className="mt-4" onClick={() => setActivePage('search')}>Return to Search</Button>
          </div>
        )
      ) : activePage === 'dashboard' ? (
        <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
          <SocDashboard />
        </div>
      ) : activePage === 'investigations' ? (
        <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
          <InvestigationsPage 
            onRunAgain={(item) => {
              setActivePage('search')
              runHistoryItem(item)
            }}
            onExport={(queryId) => void handleExport(queryId)}
            canExport={canUseExport}
            onBack={() => setActivePage('search')}
          />
        </div>
      ) : isLandingPage ? (
        <div className="flex-1 w-full relative">
          <SocHero
            topRightContent={
              <div className="flex items-center gap-3">
                {canUseHistory ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActivePage('investigations')}
                    className="text-zinc-300 hover:text-white hover:bg-white/10"
                  >
                    <ScrollText className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">Investigations</span>
                  </Button>
                ) : null}
                {auth.enabled ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={auth.signOut}
                    className={LOGOUT_BUTTON_CLASS}
                  >
                    <LogOut className="size-4 mr-2" />
                    Logout
                  </Button>
                ) : null}
              </div>
            }
          >
            <div className="w-full text-left">
              <SearchSection
                question={question}
                scenarios={mockScenarios}
                isLoading={requestStatus === 'loading'}
                isMockMode={isMockMode}
                onQuestionChange={setQuestion}
                onSubmitQuestion={submitQuestion}
                onSelectSuggestion={submitQuestion}
              />
            </div>
          </SocHero>
        </div>
      ) : (
        <div className="min-w-0 flex-1">


        <main className="mx-auto flex min-w-0 w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6">
          <SearchSection
            question={question}
            scenarios={mockScenarios}
            isLoading={requestStatus === 'loading'}
            isMockMode={isMockMode}
            onQuestionChange={setQuestion}
            onSubmitQuestion={submitQuestion}
            onSelectSuggestion={submitQuestion}
            currentQueryId={response?.query_id}
            isPinned={isCurrentQueryPinned}
            onTogglePin={handleTogglePinCurrentQuery}
            canPin={canUseHistory}
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
                summary={response.summary}
                summarySource={response.summary_source}
                summaryLatencyMs={response.summary_latency_ms}
                isMockMode={isMockMode}
              />

              <QueryTransparency
                searchPlan={response.search_plan}
                generatedDsl={response.generated_dsl}
                canEditPlan={canEditPlan}
                onRunEditedPlan={async (editedPlan) => {
                   searchAbortRef.current?.abort()
                   exportAbortRef.current?.abort()
                   exportAbortRef.current = null
                   const controller = new AbortController()
                   searchAbortRef.current = controller
                   closeDetail()
                   // We do not setResponse(null) or setRequestStatus('loading') here
                   // to keep the editor and current results visible while running.
                   // The editor component handles its own loading spinner.
                   
                   try {
                     const { runSearchPlan } = await import('@/services/search-plan-api')
                     const nextResponse = await runSearchPlan(editedPlan, controller.signal)
                     if (controller.signal.aborted) {
                       return
                     }
                     setResponse(nextResponse)
                     setIsCurrentQueryPinned(false)
                     setSearchError(null)
                     setExportStatus('idle')
                     setExportMessage(null)
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
                     // Let QueryTransparency handle the error to keep editor open
                     throw error
                   } finally {
                     if (searchAbortRef.current === controller) {
                       searchAbortRef.current = null
                     }
                     if (
                       !controller.signal.aborted &&
                       historyOpenRef.current &&
                       canUseHistory
                     ) {
                       void loadHistory(historyPageRef.current)
                     }
                   }
                }}
              />

              <ResultTabs
                mode={response.mode}
                activeTab={activeTab}
                events={response.events}
                aggregationResults={response.aggregation_results}
                chartMetadata={response.chart_metadata}
                total={response.total}
                page={response.page}
                size={response.size}
                totalPages={response.total_pages}
                isMockMode={isMockMode}
                queryId={response.query_id}
                exportStatus={exportStatus}
                exportMessage={exportMessage}
                canExportCsv={canUseExport}
                exportDisabled={
                  requestStatus === 'loading' ||
                  exportStatus === 'loading' ||
                  !response.query_id ||
                  !canUseExport
                }
                timeRangeLabel={timeRangeLabel}
                response={response}
                onTabChange={setActiveTab}
                onPageChange={changePage}
                onSelectEvent={openEventDetail}
                onExport={() => void handleExport(response.query_id)}
                onSuggestionClick={submitQuestion}
              />
            </>
          ) : null}
        </main>
      </div>
      )}

      <EventDetailDrawer
        event={eventDetail}
        status={detailStatus}
        error={detailError}
        canViewRawLog={canUseRawLog}
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDetail()
          }
        }}
        onRetry={retryEventDetail}
      />

      <HistorySheet
        open={historyOpen && canUseHistory}
        status={historyStatus}
        response={historyResponse}
        error={historyError}
        onOpenChange={(open) => {
          const nextOpen = open && canUseHistory
          historyOpenRef.current = nextOpen
          setHistoryOpen(nextOpen)
          if (!nextOpen) {
            historyAbortRef.current?.abort()
            historyAbortRef.current = null
          } else {
            void loadHistory(0) // recent queries
          }
        }}
        onViewAll={() => {
          setHistoryOpen(false)
          setActivePage('investigations')
        }}
        onRunAgain={(item) => {
          setHistoryOpen(false)
          setActivePage('search')
          runHistoryItem(item)
        }}
        onRetry={() => loadHistory(0)}
      />
    </div>
  )
}

export default App
