import {
  Activity,
  AlertCircle,
  BarChart3,
  BrainCircuit,
  Loader2,
  LogIn,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { useSocAuth, type SocAuthState } from '@/auth/auth-context'

/* ─────────────────────────── shared background ─────────────────────────── */

const cyberGridStyle: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(rgba(6,182,212,0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6,182,212,0.07) 1px, transparent 1px)
  `,
  backgroundSize: '40px 40px',
}

const gradientOverlayStyle: React.CSSProperties = {
  background: `
    radial-gradient(ellipse 70% 50% at 50% 50%, rgba(6,182,212,0.12) 0%, transparent 70%),
    radial-gradient(ellipse 50% 40% at 65% 38%, rgba(139,92,246,0.09) 0%, transparent 70%)
  `,
}

function CyberBackground() {
  return (
    <>
      {/* Cyber-grid base */}
      <div className="absolute inset-0" style={cyberGridStyle} />
      {/* Radial gradient glows */}
      <div className="absolute inset-0" style={gradientOverlayStyle} />

      {/* Scan-line decorators */}
      <div
        className="absolute right-16 top-20 h-1 w-24 rounded-full bg-cyan-400/40 animate-pulse"
        style={{ animationDuration: '3s', animationDelay: '0s' }}
      />
      <div
        className="absolute bottom-28 left-12 h-1 w-16 rounded-full bg-violet-400/30 animate-pulse"
        style={{ animationDuration: '3s', animationDelay: '1.5s' }}
      />
      <div
        className="absolute right-32 top-1/3 h-0.5 w-8 rounded-full bg-cyan-300/25 animate-pulse"
        style={{ animationDuration: '4s', animationDelay: '0.8s' }}
      />

      {/* Corner particle dots */}
      <div className="absolute left-8 top-8 size-1.5 rounded-full bg-cyan-400/50 animate-ping"
        style={{ animationDuration: '2.5s' }} />
      <div className="absolute bottom-10 right-10 size-1 rounded-full bg-violet-400/40 animate-ping"
        style={{ animationDuration: '3.5s', animationDelay: '1s' }} />
    </>
  )
}

/* ─────────────────────────── keyframe styles ────────────────────────────── */

const injectableStyles = `
  @keyframes iconPulse {
    0%, 100% { box-shadow: 0 0 0px rgba(6,182,212,0); }
    50%       { box-shadow: 0 0 22px rgba(6,182,212,0.45); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .soc-icon-pulse {
    animation: iconPulse 2.5s ease-in-out infinite;
  }
  .soc-fade-in-up {
    animation: fadeInUp 0.45s ease-out both;
  }
  .soc-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.6) 50%, transparent 100%);
    animation: shimmer 1.6s ease-in-out infinite;
  }
`

function GlobalStyles() {
  return <style dangerouslySetInnerHTML={{ __html: injectableStyles }} />
}

/* ─────────────────────────── loading state ──────────────────────────────── */

function LoadingView() {
  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-4 text-foreground">
      <GlobalStyles />
      <CyberBackground />

      <div
        className="soc-fade-in-up relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-700/60 bg-zinc-900/70 p-8 text-center shadow-2xl backdrop-blur-xl"
        style={{ boxShadow: '0 0 60px -10px rgba(6,182,212,0.2), 0 25px 50px -12px rgba(0,0,0,0.8)' }}
      >
        {/* Animated icon */}
        <div className="soc-icon-pulse mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/30">
          <Loader2 className="size-7 animate-spin text-cyan-300" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          Restoring Secure Session
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Verifying your Keycloak credentials...
        </p>

        {/* Shimmer progress bar */}
        <div className="soc-shimmer relative mt-6 h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
          {/* shimmer rendered by ::after pseudo-element via CSS */}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
        <p className="text-xs text-zinc-600">
          End-to-End Encrypted Connection · SOC Environment MVP v1.0
        </p>
        <p className="text-xs text-zinc-700">🛡️ Protected by Caddy &amp; Keycloak</p>
      </div>
    </div>
  )
}

/* ─────────────────────────── login landing page ─────────────────────────── */

function LoginView({ auth }: { auth: SocAuthState }) {
  return (
    <div className="dark relative flex min-h-svh items-center justify-center overflow-hidden bg-zinc-950 px-4 text-foreground">
      <GlobalStyles />
      <CyberBackground />

      {/* Main auth card */}
      <div
        className="soc-fade-in-up relative z-10 w-full max-w-md rounded-3xl border border-zinc-700/60 bg-zinc-900/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
        style={{ boxShadow: '0 0 60px -10px rgba(6,182,212,0.25), 0 25px 50px -12px rgba(0,0,0,0.9)' }}
      >
        {/* ── Branding header ── */}
        <div className="mb-5 flex items-center gap-4">
          <div
            className="soc-icon-pulse flex shrink-0 size-13 items-center justify-center rounded-2xl bg-cyan-400/10 p-3 ring-1 ring-cyan-400/30"
          >
            <ShieldHalf className="size-7 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              SOC AI Search
            </h1>
            <p
              className="mt-0.5 text-xs font-semibold tracking-widest text-cyan-400/80 uppercase"
            >
              Next-Generation Security Operations
            </p>
          </div>
        </div>

        {/* Thin separator */}
        <div className="mb-5 h-px w-full bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />

        {/* ── Description ── */}
        <p className="mb-6 text-sm leading-relaxed text-zinc-400">
          Welcome to the secure analyst console. Authenticate via Keycloak to
          access the AI-powered event search engine, real-time aggregations,
          and automated threat summarization.
        </p>

        {/* ── Feature badges ── */}
        <div className="mb-7 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <BrainCircuit className="size-3" />
            Natural Language Query
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <BarChart3 className="size-3" />
            Real-time Aggregation
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <ShieldCheck className="size-3" />
            Zero-Trust RBAC
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400">
            <Activity className="size-3" />
            Live Elasticsearch
          </span>
        </div>

        {/* ── Error message ── */}
        {auth.errorMessage ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="leading-snug">{auth.errorMessage}</span>
          </div>
        ) : null}

        {/* ── CTA Button ── */}
        <button
          type="button"
          onClick={auth.signIn}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white transition-all duration-200 hover:from-cyan-400 hover:to-blue-500 hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(6,182,212,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          <LogIn className="size-4" />
          Sign in with Keycloak
        </button>

        {/* ── Subtle note below button ── */}
        <p className="mt-4 text-center text-[11px] text-zinc-600">
          Redirects to your organisation's Keycloak instance
        </p>
      </div>

      {/* ── Footer trust marks ── */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1">
        <p className="text-xs text-zinc-600">
          End-to-End Encrypted Connection · SOC Environment MVP v1.0
        </p>
        <p className="text-xs text-zinc-700">🛡️ Protected by Caddy &amp; Keycloak</p>
      </div>
    </div>
  )
}

/* ─────────────────────────── exported gate ─────────────────────────────── */

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
    return <LoadingView />
  }

  if (!auth.authenticated) {
    return <LoginView auth={auth} />
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
