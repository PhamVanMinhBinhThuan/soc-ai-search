import { useEffect } from "react";
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
import { FollowUpSuggestions } from "@/components/soc/follow-up-suggestions";
import { HistorySheet } from "@/components/soc/history-sheet";
import { AiSummaryCard } from "@/components/soc/metrics-summary";
import { QueryTransparency } from "@/components/soc/query-transparency";
import { ResultTabs } from "@/components/soc/result-tabs";
import { SearchSection } from "@/components/soc/search-section";
import { AuditLogsPage } from "@/components/soc/admin/audit-logs-page";
import { InvestigationsPage } from "@/components/soc/investigations/investigations-page";
import { QueryLibraryPage } from "@/components/soc/query-library-page";
import { SocDashboard } from "@/components/soc/dashboard/soc-dashboard";
import {
  SearchErrorState,
  SearchIdleState,
  SearchLoadingState,
} from "@/components/soc/search-status";
import { SocSidebar } from "@/components/soc/soc-sidebar";
import { Button } from "@/components/ui/button";
import { pageFromPath, pathForPage } from "@/lib/app-routes";
import { mockScenarios } from "@/lib/mock-data";
import { setAuthTokenHandlers } from "@/services/api-client";
import { isMockMode } from "@/services/search-api";
import { useEventDetail } from "@/hooks/use-event-detail";
import { useSearchExport } from "@/hooks/use-search-export";
import { useSearchHistoryModal } from "@/hooks/use-search-history-modal";
import { useSearchWorkflow } from "@/hooks/use-search-workflow";

const HISTORY_PAGE_SIZE = 5;

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
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = pageFromPath(location.pathname);

  const eventDetail = useEventDetail({ canViewEventDetail: canUseSearch });
  const historyModal = useSearchHistoryModal({
    canViewHistory: canUseHistory,
    pageSize: HISTORY_PAGE_SIZE,
  });
  const searchExport = useSearchExport();

  useEffect(() => {
    setAuthTokenHandlers({
      getAccessToken: () => auth.accessToken,
      refreshAccessToken: auth.refreshAccessToken,
    });
    return () => setAuthTokenHandlers(null);
  }, [auth.accessToken, auth.refreshAccessToken]);

  const reloadHistoryIfOpen = () => {
    if (historyModal.openRef.current) {
      void historyModal.load(historyModal.pageRef.current);
    }
  };

  const {
    question,
    setQuestion,
    response,
    summaryVisible,
    followUpSuggestionKey,
    searchFocusSignal,
    originalAiSearchPlan,
    isCurrentQueryPinned,
    requestStatus,
    searchError,
    activeTab,
    setActiveTab,
    submitQuestion,
    currentOriginalQuestion,
    currentRunnableQuestion,
    changePage,
    runRefinedSearchPlan,
    runEditedSearchPlan,
    handleTogglePinCurrentQuery,
    retrySearch,
    selectFollowUpSuggestion,
    selectDefaultSuggestion,
    runHistoryItem,
    fillHistoryItemQuestion,
    buildAiCorrectedAuditQuestion,
  } = useSearchWorkflow({
    canUseHistory,
    closeEventDetail: eventDetail.close,
    resetExport: searchExport.reset,
    reloadHistoryIfOpen,
    navigate,
  });

  const navigateToAuditLogs = () => {
    navigate("/audit-logs");
  };

  const handleExport = (overrideQueryId?: string) =>
    searchExport.exportSearch({
      queryId: overrideQueryId,
      response,
      canExport: canUseExport,
      isMockMode,
    });

  return (
    <div className="dark flex min-h-svh bg-background text-foreground">
      <SocSidebar
        identity={auth.email || auth.identity}
        roles={auth.roles}
        authLoading={auth.loading}
        authEnabled={auth.enabled}
        activePage={activePage}
        onPageChange={(p) => navigate(pathForPage(p))}
        onOpenAuditLogs={navigateToAuditLogs}
        onLogout={auth.signOut}
      />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          path="/audit-logs"
          element={
            canUseAuditLogs ? (
              <div className="flex-1 w-full relative min-w-0 flex flex-col h-svh">
                <AuditLogsPage />
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
              <SocDashboard
                authEnabled={auth.enabled}
                authLoading={auth.loading}
                authenticated={auth.authenticated}
                accessTokenReady={Boolean(auth.accessToken)}
              />
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
                  historyModal.close();
                  runHistoryItem(item);
                }}
                onExport={(queryId) => void handleExport(queryId)}
                canExport={canUseExport}
              />
            </div>
          }
        />

        <Route
          path="/search"
          element={
            <div className="relative h-svh min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#050a10]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.11),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(168,85,247,0.1),transparent_26%),radial-gradient(circle_at_55%_95%,rgba(255,45,85,0.055),transparent_34%)]" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.075] [background-image:linear-gradient(rgba(34,211,238,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.4)_1px,transparent_1px)] [background-size:44px_44px]" />
              <main className="relative mx-auto flex min-h-svh min-w-0 w-full max-w-[1540px] flex-col gap-4 p-4 sm:p-5">
                <SearchSection
                  question={question}
                  scenarios={mockScenarios}
                  isLoading={requestStatus === "loading"}
                  isMockMode={isMockMode}
                  onQuestionChange={setQuestion}
                  onSubmitQuestion={submitQuestion}
                  onSelectSuggestion={selectDefaultSuggestion}
                  currentQueryId={response?.query_id}
                  isPinned={isCurrentQueryPinned}
                  onTogglePin={handleTogglePinCurrentQuery}
                  canPin={canUseHistory}
                  focusSignal={searchFocusSignal}
                  onOpenQueryLibrary={() => navigate('/query-library')}
                  onOpenRecentQueries={
                    canUseHistory ? historyModal.openRecentQueries : undefined
                  }
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
                      chartMetadata={response.chart_metadata}
                      canEditPlan={canEditPlan}
                      currentQuestion={currentRunnableQuestion()}
                      originalQuestion={currentOriginalQuestion()}
                      onApplyQueryUpdate={({
                        rewrittenQuestion,
                        feedback,
                        originalQuestion,
                      }) =>
                        submitQuestion(
                          rewrittenQuestion,
                          buildAiCorrectedAuditQuestion({
                            original: originalQuestion,
                            feedback,
                            rewritten: rewrittenQuestion,
                          }),
                        )
                      }
                      onRunEditedPlan={runEditedSearchPlan}
                    />

                    {summaryVisible ? (
                      <AiSummaryCard
                        summary={response.summary}
                        isMockMode={isMockMode}
                      />
                    ) : null}

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
                      exportStatus={searchExport.status}
                      exportMessage={searchExport.message}
                      canExportCsv={canUseExport}
                      exportDisabled={
                        requestStatus === "loading" ||
                        searchExport.status === "loading" ||
                        !response.query_id ||
                        !canUseExport
                      }
                      response={response}
                      onTabChange={setActiveTab}
                      onPageChange={changePage}
                      onSelectEvent={eventDetail.openEventDetail}
                      onExport={() => void handleExport(response.query_id)}
                      onApplyResultPlan={(plan) =>
                        void runRefinedSearchPlan(plan)
                      }
                    />

                    <FollowUpSuggestions
                      response={response}
                      question={currentOriginalQuestion()}
                      enabled={
                        followUpSuggestionKey !== null &&
                        (requestStatus === "success" ||
                          requestStatus === "empty")
                      }
                      suggestionKey={followUpSuggestionKey}
                      onSelectSuggestion={selectFollowUpSuggestion}
                    />
                  </>
                ) : null}
              </main>
            </div>
          }
        />

        <Route
          path="/query-library"
          element={
            <QueryLibraryPage
              onUseQuery={(q) => {
                selectDefaultSuggestion(q);
                navigate('/search');
              }}
            />
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <EventDetailDrawer
        event={eventDetail.eventDetail}
        status={eventDetail.status}
        error={eventDetail.error}
        canViewRawLog={canUseRawLog}
        open={eventDetail.open}
        onOpenChange={(open) => {
          if (!open) {
            eventDetail.close();
          }
        }}
        onRetry={eventDetail.retry}
      />

      <HistorySheet
        open={historyModal.open && canUseHistory}
        status={historyModal.status}
        response={historyModal.response}
        error={historyModal.error}
        onOpenChange={historyModal.setModalOpen}
        onViewAll={() => {
          historyModal.close();
          navigate("/investigations");
        }}
        onRunAgain={(item) => {
          historyModal.close();
          fillHistoryItemQuestion(item);
        }}
        onRetry={() => historyModal.load(0)}
      />
    </div>
  );
}

export default App;
