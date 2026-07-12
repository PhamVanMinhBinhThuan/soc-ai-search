import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

import { AuthGate, SocAuthProvider } from "@/features/auth";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SocAuthProvider>
      <AuthGate>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthGate>
    </SocAuthProvider>
  );
}
