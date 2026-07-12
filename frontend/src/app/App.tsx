import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  canEditSearchPlan,
  canExportCsv,
  canViewAuditLogs,
  canViewBasicEventDetail,
  canViewHistory,
  canViewRawLog,
  useSocAuth,
} from "@/features/auth";
import {
  EventDetailDrawer,
  HistorySheet,
  isMockMode,
  useEventDetail,
  useSearchExport,
  useSearchHistoryModal,
  useSearchWorkflow,
} from "@/features/search";
import { AppLayout } from "@/app/components/app-layout";
import { pageFromPath, pathForPage } from "@/app/app-routes";
import { AppRoutes } from "@/app/routes";
import { setAuthTokenHandlers } from "@/shared/services/api/api-client";

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

  const workflow = useSearchWorkflow({
    canUseHistory,
    closeEventDetail: eventDetail.close,
    resetExport: searchExport.reset,
    reloadHistoryIfOpen,
    navigate,
  });
  const { response, fillHistoryItemQuestion } = workflow;

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
    <AppLayout
      identity={auth.email || auth.identity}
      roles={auth.roles}
      authLoading={auth.loading}
      authEnabled={auth.enabled}
      activePage={activePage}
      onPageChange={(p) => navigate(pathForPage(p))}
      onOpenAuditLogs={navigateToAuditLogs}
      onLogout={auth.signOut}
    >
      <AppRoutes
        authEnabled={auth.enabled}
        authLoading={auth.loading}
        authenticated={auth.authenticated}
        accessTokenReady={Boolean(auth.accessToken)}
        canUseAuditLogs={canUseAuditLogs}
        canUseExport={canUseExport}
        canUseHistory={canUseHistory}
        canEditPlan={canEditPlan}
        eventDetail={eventDetail}
        historyModal={historyModal}
        searchExport={searchExport}
        workflow={workflow}
        navigate={navigate}
        handleExport={handleExport}
      />

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
    </AppLayout>
  );
}

export default App;
