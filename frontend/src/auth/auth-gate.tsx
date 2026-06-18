import { Loader2, LogIn, ShieldHalf } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useSocAuth, type SocAuthState } from '@/auth/auth-context'

export function AuthGateView({
  auth,
  children,
}: {
  auth: SocAuthState
  children: ReactNode
}) {
  if (!auth.enabled) {
    return children
  }

  if (auth.loading) {
    return (
      <div className="dark flex min-h-svh items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/60 p-8 text-center shadow-2xl shadow-cyan-950/20">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25">
            <Loader2 className="size-7 animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">
              Restoring secure session
            </h1>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Checking your Keycloak login state before opening the SOC
              console.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!auth.authenticated) {
    return (
      <div className="dark flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,#164e63_0%,transparent_34%),#020617] px-4 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-zinc-950/80 p-8 shadow-2xl shadow-cyan-950/40 backdrop-blur">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25">
              <ShieldHalf className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">SOC AI Search</h1>
              <p className="text-sm text-muted-foreground">
                Secure analyst console
              </p>
            </div>
          </div>

          <p className="mb-6 text-sm leading-6 text-zinc-300">
            Sign in with Keycloak to continue. User management and roles are
            handled by Keycloak; backend RBAC and UI permissions are enforced
            from the issued token.
          </p>

          {auth.errorMessage ? (
            <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              {auth.errorMessage}
            </div>
          ) : null}

          <Button
            className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            onClick={auth.signIn}
          >
            <LogIn />
            Sign in with Keycloak
          </Button>
        </div>
      </div>
    )
  }

  return children
}

export function AuthGate({ children }: { children: ReactNode }) {
  return (
    <AuthGateView auth={useSocAuth()}>
      {children}
    </AuthGateView>
  )
}
