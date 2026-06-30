import { useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  canEditSearchPlan,
  canExportCsv,
  canViewAuditLogs,
  canViewBasicEventDetail,
  canViewHistory,
  canViewRawLog,
} from "@/auth/permissions";
import { useSocAuth } from "@/auth/use-auth";
import { EventDetailDrawer } from "@/components/soc/event-detail-drawer";
import { HistorySheet } from "@/components/soc/history-sheet";
import { AiSummaryCard } from "@/components/soc/metrics-summary";
import { QueryTransparency } from "@/components/soc/query-transparency";
import { ResultTabs, type ResultTab } from "@/components/soc/result-tabs";
import { SearchSection } from "@/components/soc/search-section";
import { AuditLogsPage } from "@/components/soc/admin/audit-logs-page";
import { InvestigationsPage } from "@/components/soc/investigations/investigations-page";
import { SocDashboard } from "@/components/soc/dashboard/soc-dashboard";
import {
  SearchErrorState,
  SearchIdleState,
  SearchLoadingState,
} from "@/components/soc/search-status";
import { SocSidebar } from "@/components/soc/soc-sidebar";
import { Button } from "@/components/ui/button";
import { initialScenario, mockScenarios } from "@/lib/mock-data";
import { downloadMockCsv } from "@/lib/mock-presentation";
import { setAccessTokenProvider } from "@/services/api-client";
import { toUiError } from "@/services/api-error-messages";
import { downloadCsvBlob, exportSearchCsv } from "@/services/csv-export-api";
import { getSearchHistory, togglePinHistory } from "@/services/history-api";
import { initialMockResponse } from "@/services/mock-search-api";
import {
  getEventDetail,
  isMockMode,
  searchEvents,
} from "@/services/search-api";
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
} from "@/types/soc";

const DEFAULT_SEARCH_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 5;

const initialResponse = isMockMode ? initialMockResponse() : null;
const initialRequest: NaturalLanguageSearchRequestDto | null = initialResponse
  ? {
      question: initialResponse.original_question,
      page: initialResponse.page,
      size: initialResponse.size,
    }
  : null;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function App() {
  const auth = useSocAuth();
  const permissionContext = {
    roles: auth.roles,
    loading: auth.loading,
  };
  const canUseSearch = canViewBasicEventDetail(permissionContext);
  const canUseHistory = canViewHistory(permissionContext);
  const canUseExport = canExportCsv(permissionContext);
  const canUseRawLog = canViewRawLog(permissionContext);
  const canEditPlan = canEditSearchPlan(permissionContext);
  const canUseAuditLogs = canViewAuditLogs(permissionContext);
  const [question, setQuestion] = useState(
    isMockMode ? initialScenario.question : "",
  );
  const [submittedRequest, setSubmittedRequest] =
    useState<NaturalLanguageSearchRequestDto | null>(initialRequest);
  const [response, setResponse] =
    useState<NaturalLanguageSearchResponseDto | null>(initialResponse);
  const [originalAiSearchPlan, setOriginalAiSearchPlan] = useState(
    initialResponse?.search_plan,
  );
  const [isCurrentQueryPinned, setIsCurrentQueryPinned] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(
    initialResponse ? "success" : "idle",
  );
  const [searchError, setSearchError] = useState<UiError | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>(
    initialResponse?.mode === "aggregation" ? "analytics" : "raw",
  );
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const activePage =
    currentPath === "/dashboard"
      ? "dashboard"
      : currentPath === "/investigations"
        ? "investigations"
        : currentPath === "/audit-logs"
          ? "audit-logs"
          : "search";

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetail, setEventDetail] = useState<EventDetailResponseDto | null>(
    null,
  );
  const [detailStatus, setDetailStatus] = useState<DetailStatus>("idle");
  const [detailError, setDetailError] = useState<UiError | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyResponse, setHistoryResponse] =
    useState<SearchHistoryPageDto | null>(null);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("idle");
  const [historyError, setHistoryError] = useState<UiError | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const searchAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const historyOpenRef = useRef(false);
  const historyPageRef = useRef(0);

  useEffect(() => {
    setAccessTokenProvider(() => auth.accessToken);
    return () => setAccessTokenProvider(null);
  }, [auth.accessToken]);

  useEffect(
    () => () => {
      searchAbortRef.current?.abort();
      detailAbortRef.current?.abort();
      historyAbortRef.current?.abort();
      exportAbortRef.current?.abort();
    },
    [],
  );

  const loadHistory = async (page: number) => {
    if (!canUseHistory) {
      setHistoryStatus("idle");
      setHistoryError({
        status: 403,
        message: "You do not have permission to view search history.",
        errors: [],
      });
      return;
    }

    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;
    setHistoryStatus("loading");
    setHistoryError(null);

    try {
      const nextHistory = await getSearchHistory(
        page,
        HISTORY_PAGE_SIZE,
        {},
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }
      setHistoryResponse(nextHistory);
      setHistoryStatus(nextHistory.items.length === 0 ? "empty" : "success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setHistoryError(toUiError(error));
      setHistoryStatus("error");
    } finally {
      if (historyAbortRef.current === controller) {
        historyAbortRef.current = null;
      }
    }
  };

  const handleTogglePinCurrentQuery = async (pinned: boolean) => {
    if (!response?.query_id) return;
    setIsCurrentQueryPinned(pinned);
    try {
      await togglePinHistory(response.query_id, pinned);
      if (historyOpenRef.current && canUseHistory) {
        void loadHistory(historyPageRef.current);
      }
    } catch (e) {
      setIsCurrentQueryPinned(!pinned);
      console.error(e);
    }
  };

  const closeDetail = () => {
    detailAbortRef.current?.abort();
    detailAbortRef.current = null;
    setDetailOpen(false);
    setSelectedEventId(null);
    setEventDetail(null);
    setDetailError(null);
    setDetailStatus("idle");
  };

  const executeSearch = async (request: NaturalLanguageSearchRequestDto) => {
    const normalizedRequest = {
      ...request,
      question: request.question.trim(),
    };

    if (!normalizedRequest.question) {
      setResponse(null);
      setSubmittedRequest(normalizedRequest);
      setSearchError({
        status: 400,
        message: "Question must not be blank",
        errors: [],
      });
      setRequestStatus("error");
      return;
    }

    searchAbortRef.current?.abort();
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    const controller = new AbortController();
    searchAbortRef.current = controller;
    closeDetail();
    setQuestion(normalizedRequest.question);
    setSubmittedRequest(normalizedRequest);
    setResponse(null);
    setOriginalAiSearchPlan(undefined);
    setSearchError(null);
    setExportStatus("idle");
    setExportMessage(null);
    setRequestStatus("loading");

    try {
      const nextResponse = await searchEvents(
        normalizedRequest,
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }

      setResponse(nextResponse);
      setOriginalAiSearchPlan(nextResponse.search_plan);
      setIsCurrentQueryPinned(false);
      setActiveTab(nextResponse.mode === "aggregation" ? "analytics" : "raw");
      const isEmpty =
        nextResponse.mode === "search"
          ? nextResponse.events.length === 0
          : nextResponse.aggregation_results.length === 0;
      setRequestStatus(isEmpty ? "empty" : "success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setResponse(null);
      setOriginalAiSearchPlan(undefined);
      setSearchError(toUiError(error));
      setRequestStatus("error");
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
      if (
        !controller.signal.aborted &&
        historyOpenRef.current &&
        canUseHistory
      ) {
        void loadHistory(historyPageRef.current);
      }
    }
  };

  const loadEventDetail = async (eventId: string) => {
    if (!canUseSearch) {
      setEventDetail(null);
      setDetailError({
        status: 403,
        message: "You do not have permission to view event details.",
        errors: [],
      });
      setDetailStatus("error");
      return;
    }

    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;
    setEventDetail(null);
    setDetailError(null);
    setDetailStatus("loading");

    try {
      const detail = await getEventDetail(eventId, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setEventDetail(detail);
      setDetailStatus("success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setDetailError(toUiError(error));
      setDetailStatus("error");
    } finally {
      if (detailAbortRef.current === controller) {
        detailAbortRef.current = null;
      }
    }
  };

  const openEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setDetailOpen(true);
    void loadEventDetail(eventId);
  };

  const submitQuestion = (nextQuestion: string) => {
    void executeSearch({
      question: nextQuestion,
      page: 0,
      size:
        response?.size ?? submittedRequest?.size ?? DEFAULT_SEARCH_PAGE_SIZE,
    });
  };

  const changePage = async (page: number) => {
    if (!response || response.mode !== "search") {
      return;
    }

    searchAbortRef.current?.abort();
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    const controller = new AbortController();
    searchAbortRef.current = controller;

    closeDetail();
    setSearchError(null);
    setExportStatus("idle");
    setExportMessage(null);
    // We don't set requestStatus to 'loading' to avoid unmounting the ResultTabs
    // ResultTabs shows a spinner internally or we can just let it be.
    // Actually, setting requestStatus = 'loading' shows SearchLoadingState and hides the table.
    // executeSearch does it, so let's keep consistent for now.
    setRequestStatus("loading");

    try {
      const { runSearchPlan } = await import("@/services/search-plan-api");
      const paginatedPlan = {
        ...response.search_plan,
        page,
        size: response.size,
      };
      const nextResponse = await runSearchPlan(
        paginatedPlan,
        controller.signal,
        response.original_question || submittedRequest?.question || question,
      );
      if (controller.signal.aborted) {
        return;
      }

      setResponse(nextResponse);
      setIsCurrentQueryPinned(false);
      setActiveTab(nextResponse.mode === "aggregation" ? "analytics" : "raw");

      const isEmpty =
        nextResponse.mode === "search"
          ? nextResponse.events.length === 0
          : nextResponse.aggregation_results.length === 0;
      setRequestStatus(isEmpty ? "empty" : "success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setSearchError(toUiError(error));
      setRequestStatus("error");
    } finally {
      if (searchAbortRef.current === controller) {
        searchAbortRef.current = null;
      }
    }
  };

  const retrySearch = () => {
    if (submittedRequest) {
      void executeSearch(submittedRequest);
    }
  };

  const retryEventDetail = () => {
    if (selectedEventId) {
      void loadEventDetail(selectedEventId);
    }
  };

  const runHistoryItem = (item: SearchHistoryItemDto) => {
    historyOpenRef.current = false;
    setHistoryOpen(false);
    setQuestion(item.question);
    void executeSearch({
      question: item.question,
      page: 0,
      size:
        response?.size ?? submittedRequest?.size ?? DEFAULT_SEARCH_PAGE_SIZE,
    });
  };

  const navigateToAuditLogs = () => {
    navigate("/audit-logs");
  };

  const handleExport = async (overrideQueryId?: string) => {
    const targetQueryId = overrideQueryId ?? response?.query_id;
    if (!targetQueryId || !canUseExport) {
      return;
    }

    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportStatus("loading");
    setExportMessage(null);

    try {
      if (isMockMode) {
        if (!overrideQueryId && response) {
          downloadMockCsv({
            mode: response.mode,
            events: response.events,
            aggregationResults: response.aggregation_results,
          });
          setExportMessage("Mock CSV downloaded from local demo data.");
        } else {
          setExportMessage(
            "Exporting historical query is not fully supported in pure mock mode.",
          );
        }
      } else {
        const exported = await exportSearchCsv(
          targetQueryId,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        downloadCsvBlob(exported.blob, exported.filename);
        setExportMessage(
          exported.truncated
            ? "The CSV contains the first 10,000 rows. The backend marked this export as truncated."
            : `Downloaded ${exported.filename}.`,
        );
      }
      setExportStatus("success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      const uiError = toUiError(error);
      setExportStatus("error");
      setExportMessage(
        [uiError.message, ...uiError.errors].filter(Boolean).join(" "),
      );
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
      }
    }
  };

  return (
    <div className="dark flex min-h-svh bg-background text-foreground">
      <SocSidebar
        identity={auth.email || auth.identity}
        roles={auth.roles}
        authLoading={auth.loading}
        authEnabled={auth.enabled}
        activePage={activePage}
        onPageChange={(p) => navigate(`/${p}`)}
        onOpenHistory={() => {
          setHistoryOpen(true);
          void loadHistory(0);
        }}
        onOpenAuditLogs={navigateToAuditLogs}
        onLogout={auth.signOut}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/search" replace />} />

        <Route
          path="/audit-logs"
          element={
            canUseAuditLogs ? (
              <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
                <AuditLogsPage onBack={() => navigate("/search")} />
              </div>
            ) : (
              <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh items-center justify-center bg-zinc-950 text-rose-500">
                <h1 className="text-2xl font-bold">403 Forbidden</h1>
                <p className="mt-2 text-zinc-400">
                  You do not have permission to view System Audit Logs.
                </p>
                <Button className="mt-4" onClick={() => navigate("/search")}>
                  Return to Search
                </Button>
              </div>
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
              <SocDashboard />
            </div>
          }
        />

        <Route
          path="/investigations"
          element={
            <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
              <InvestigationsPage
                onRunAgain={(item) => {
                  navigate("/search");
                  runHistoryItem(item);
                }}
                onExport={(queryId) => void handleExport(queryId)}
                canExport={canUseExport}
                onBack={() => navigate("/search")}
              />
            </div>
          }
        />

        <Route
          path="/search"
          element={
            <div className="min-w-0 flex-1">
              <main className="mx-auto flex min-w-0 w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6">
                <SearchSection
                  question={question}
                  scenarios={mockScenarios}
                  isLoading={requestStatus === "loading"}
                  isMockMode={isMockMode}
                  onQuestionChange={setQuestion}
                  onSubmitQuestion={submitQuestion}
                  onSelectSuggestion={submitQuestion}
                  currentQueryId={response?.query_id}
                  isPinned={isCurrentQueryPinned}
                  onTogglePin={handleTogglePinCurrentQuery}
                  canPin={canUseHistory}
                />

                {requestStatus === "idle" ? <SearchIdleState /> : null}

                {requestStatus === "loading" ? <SearchLoadingState /> : null}

                {requestStatus === "error" && searchError ? (
                  <SearchErrorState error={searchError} onRetry={retrySearch} />
                ) : null}

                {response ? (
                  <>
                    <QueryTransparency
                      searchPlan={response.search_plan}
                      resetSearchPlan={originalAiSearchPlan}
                      generatedDsl={response.generated_dsl}
                      canEditPlan={canEditPlan}
                      onRunEditedPlan={async (editedPlan) => {
                        searchAbortRef.current?.abort();
                        exportAbortRef.current?.abort();
                        exportAbortRef.current = null;
                        const controller = new AbortController();
                        searchAbortRef.current = controller;
                        closeDetail();

                        try {
                          const { runSearchPlan } =
                            await import("@/services/search-plan-api");
                          const nextResponse = await runSearchPlan(
                            editedPlan,
                            controller.signal,
                            response.original_question ||
                              submittedRequest?.question ||
                              question,
                          );
                          if (controller.signal.aborted) {
                            return;
                          }
                          setResponse(nextResponse);
                          setIsCurrentQueryPinned(false);
                          setSearchError(null);
                          setExportStatus("idle");
                          setExportMessage(null);
                          setActiveTab(
                            nextResponse.mode === "aggregation"
                              ? "analytics"
                              : "raw",
                          );
                          const isEmpty =
                            nextResponse.mode === "search"
                              ? nextResponse.events.length === 0
                              : nextResponse.aggregation_results.length === 0;
                          setRequestStatus(isEmpty ? "empty" : "success");
                        } catch (error) {
                          if (isAbortError(error)) {
                            return;
                          }
                          throw error;
                        } finally {
                          if (searchAbortRef.current === controller) {
                            searchAbortRef.current = null;
                          }
                          if (
                            !controller.signal.aborted &&
                            historyOpenRef.current &&
                            canUseHistory
                          ) {
                            void loadHistory(historyPageRef.current);
                          }
                        }
                      }}
                    />

                    <AiSummaryCard
                      summary={response.summary}
                      isMockMode={isMockMode}
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
                        requestStatus === "loading" ||
                        exportStatus === "loading" ||
                        !response.query_id ||
                        !canUseExport
                      }
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
          }
        />

        <Route path="*" element={<Navigate to="/search" replace />} />
      </Routes>

      <EventDetailDrawer
        event={eventDetail}
        status={detailStatus}
        error={detailError}
        canViewRawLog={canUseRawLog}
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDetail();
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
          const nextOpen = open && canUseHistory;
          historyOpenRef.current = nextOpen;
          setHistoryOpen(nextOpen);
          if (!nextOpen) {
            historyAbortRef.current?.abort();
            historyAbortRef.current = null;
          } else {
            void loadHistory(0); // recent queries
          }
        }}
        onViewAll={() => {
          setHistoryOpen(false);
          navigate("/investigations");
        }}
        onRunAgain={(item) => {
          setHistoryOpen(false);
          navigate("/search");
          runHistoryItem(item);
        }}
        onRetry={() => loadHistory(0)}
      />
    </div>
  );
}

export default App;
