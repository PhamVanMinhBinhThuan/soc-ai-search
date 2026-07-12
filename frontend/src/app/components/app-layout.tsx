import type { ReactNode } from "react";

import { SocSidebar } from "./soc-sidebar";
import type { SocPage } from "@/app/app-routes";

type AppLayoutProps = {
  identity: string;
  roles: string[];
  authLoading: boolean;
  authEnabled: boolean;
  activePage: SocPage;
  onPageChange: (page: SocPage) => void;
  onOpenAuditLogs: () => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppLayout({
  identity,
  roles,
  authLoading,
  authEnabled,
  activePage,
  onPageChange,
  onOpenAuditLogs,
  onLogout,
  children,
}: AppLayoutProps) {
  return (
    <div className="dark flex min-h-svh bg-background text-foreground">
      <SocSidebar
        identity={identity}
        roles={roles}
        authLoading={authLoading}
        authEnabled={authEnabled}
        activePage={activePage}
        onPageChange={onPageChange}
        onOpenAuditLogs={onOpenAuditLogs}
        onLogout={onLogout}
      />
      {children}
    </div>
  );
}
