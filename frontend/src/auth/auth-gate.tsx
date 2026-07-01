import { Shield, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

import { useSocAuth, type SocAuthState } from '@/auth/auth-context'
import { SocHero } from '@/components/hero/soc-hero'

function LandingView({ auth }: { auth: SocAuthState }) {
  const handleLogin = auth.signIn

  return (
    <SocHero
      onAccessConsole={handleLogin}
      statusContent={
        auth.errorMessage ? (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-sm text-rose-300 backdrop-blur-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{auth.errorMessage}</span>
          </div>
        ) : null
      }
    />
  )
}

function LoadingView() {
  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-[#030712] px-4 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(34,211,238,0.14), transparent 34%), radial-gradient(circle at 50% 55%, rgba(168,85,247,0.12), transparent 40%), #030712',
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-4 py-2 text-center"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
          <Shield className="size-7 animate-pulse text-cyan-300" />
        </div>
        <div>
          <p className="text-base font-bold tracking-tight text-white">
            Securing Your Connection
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Verifying your workspace...
          </p>
        </div>
        <div className="relative h-0.5 w-64 overflow-hidden rounded-full bg-zinc-800/90">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300 to-transparent bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />
        </div>
      </motion.div>
    </div>
  )
}

export function AuthGateView({
  auth,
  children,
}: {
  auth: SocAuthState
  children: ReactNode
}) {
  if (!auth.enabled) return children
  if (auth.loading) return <LoadingView />
  if (!auth.authenticated) return <LandingView auth={auth} />
  return children
}

export function AuthGate({ children }: { children: ReactNode }) {
  return <AuthGateView auth={useSocAuth()}>{children}</AuthGateView>
}
