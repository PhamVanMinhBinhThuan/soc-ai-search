import { Navigate, Route, Routes, type NavigateFunction } from "react-router-dom";

import { AuditLogsPage } from "@/features/audit-logs";
import { SocDashboard } from "@/features/dashboard";
import { InvestigationsPage } from "@/features/investigations";
import { QueryLibraryPage } from "@/features/query-library";
import {
  AiSummaryCard,
  FollowUpSuggestions,
  QueryTransparency,
  ResultTabs,
  SearchErrorState,
  SearchIdleState,
  SearchLoadingState,
  SearchSection,
  isMockMode,
  mockScenarios,
} from "@/features/search";
import type {
  useEventDetail,
  useSearchExport,
  useSearchHistoryModal,
  useSearchWorkflow,
} from "@/features/search";
import { Button } from "@/shared/components/ui/button";

type SearchWorkflowState = ReturnType<typeof useSearchWorkflow>;
type EventDetailState = ReturnType<typeof useEventDetail>;
type SearchExportState = ReturnType<typeof useSearchExport>;
type SearchHistoryModalState = ReturnType<typeof useSearchHistoryModal>;

type AppRoutesProps = {
  authEnabled: boolean;
  authLoading: boolean;
  authenticated: boolean;
  accessTokenReady: boolean;
  canUseAuditLogs: boolean;
  canUseExport: boolean;
  canUseHistory: boolean;
  canEditPlan: boolean;
  eventDetail: EventDetailState;
  historyModal: SearchHistoryModalState;
  searchExport: SearchExportState;
  workflow: SearchWorkflowState;
  navigate: NavigateFunction;
  handleExport: (overrideQueryId?: string) => Promise<void> | void;
};

export function AppRoutes({
  authEnabled,
  authLoading,
  authenticated,
  accessTokenReady,
  canUseAuditLogs,
  canUseExport,
  canUseHistory,
  canEditPlan,
  eventDetail,
  historyModal,
  searchExport,
  workflow,
  navigate,
  handleExport,
}: AppRoutesProps) {
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
    buildAiCorrectedAuditQuestion,
  } = workflow;

  return (
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
              authEnabled={authEnabled}
              authLoading={authLoading}
              authenticated={authenticated}
              accessTokenReady={accessTokenReady}
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
                onOpenQueryLibrary={() => navigate("/query-library")}
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
                    onApplyResultPlan={(plan) => void runRefinedSearchPlan(plan)}
                  />

                  <FollowUpSuggestions
                    response={response}
                    question={currentOriginalQuestion()}
                    enabled={
                      followUpSuggestionKey !== null &&
                      (requestStatus === "success" || requestStatus === "empty")
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
              navigate("/search");
            }}
          />
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
