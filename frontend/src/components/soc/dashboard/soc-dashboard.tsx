import { useCallback, useEffect, useRef, useState } from "react"
import { Clock3, RefreshCcw, LayoutDashboard } from "lucide-react"
import { KpiCards } from "./kpi-cards"
import { EventsOverTime } from "./events-over-time"
import { SeverityDistribution } from "./severity-distribution"
import { TopSourceIps } from "./top-source-ips"
import type { DashboardMetricsDto, SearchPlanDto, SearchPlanResponseDto } from "@/types/soc"
import { executeSearchPlan } from "@/services/search-api"
import { ApiError } from "@/services/api-client"

// Mock data to simulate API response

const DASHBOARD_REFRESH_INTERVAL_MS = 3 * 60 * 1000

type SocDashboardProps = {
  authEnabled?: boolean
  authLoading?: boolean
  authenticated?: boolean
  accessTokenReady?: boolean
}

export function SocDashboard({
  authEnabled = false,
  authLoading = false,
  authenticated = true,
  accessTokenReady = true,
}: SocDashboardProps) {
  const [data, setData] = useState<DashboardMetricsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardError, setDashboardError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const refreshingRef = useRef(false)
  const intervalAbortRef = useRef<AbortController | null>(null)
  const canFetchDashboard =
    !authEnabled || (!authLoading && authenticated && accessTokenReady)
  const authUnavailableMessage =
    authEnabled && !authLoading && !authenticated
      ? 'Please sign in to view dashboard metrics.'
      : null
  const visibleError = authUnavailableMessage ?? dashboardError

  useEffect(() => {
    refreshingRef.current = refreshing
  }, [refreshing])

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    await Promise.resolve()
    if (signal?.aborted) return

    setRefreshing(true)
    setDashboardError(null)
    
    // We run 5 queries
    const failedLoginsPlan: SearchPlanDto = {
      mode: 'search',
      page: 0,
      size: 1,
      message_query: null,
      aggregation: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' }, event_type: ['failed_login'] },
    }
    const criticalPlan: SearchPlanDto = {
      mode: 'search',
      page: 0,
      size: 1,
      message_query: null,
      aggregation: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' }, severity: ['critical', 'high'] },
    }
    const timePlan: SearchPlanDto = {
      mode: 'aggregation',
      page: 0,
      size: 1,
      message_query: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' } },
      aggregation: { type: 'date_histogram', interval: 'hour' },
    }
    const severityPlan: SearchPlanDto = {
      mode: 'aggregation',
      page: 0,
      size: 1,
      message_query: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' } },
      aggregation: { type: 'group_by', field: 'severity', top_n: 10 },
    }
    const topIpPlan: SearchPlanDto = {
      mode: 'aggregation',
      page: 0,
      size: 1,
      message_query: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' } },
      aggregation: { type: 'top_n', field: 'ip', top_n: 5 },
    }

    try {
      const dashboardQueryOptions = { audit: false }
      const [failedRes, critRes, timeRes, sevRes, topIpRes] = await Promise.allSettled([
        executeSearchPlan(failedLoginsPlan, signal, dashboardQueryOptions),
        executeSearchPlan(criticalPlan, signal, dashboardQueryOptions),
        executeSearchPlan(timePlan, signal, dashboardQueryOptions),
        executeSearchPlan(severityPlan, signal, dashboardQueryOptions),
        executeSearchPlan(topIpPlan, signal, dashboardQueryOptions),
      ])

      if (signal?.aborted) return

      const results = [failedRes, critRes, timeRes, sevRes, topIpRes]
      const hasUnauthorizedRequest = results.some(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof ApiError &&
          result.reason.status === 401,
      )

      if (hasUnauthorizedRequest) {
        setData(null)
        setDashboardError('Dashboard request is unauthorized. Please sign in again.')
        setLoading(false)
        return
      }

      const safeTotal = (res: PromiseSettledResult<SearchPlanResponseDto>) => 
        res.status === 'fulfilled' ? res.value.total : 0
    
      const eventsOverTime = timeRes.status === 'fulfilled' 
        ? (timeRes.value.aggregation_results || []).map((b: { key: string; value: number }) => ({ timestamp: b.key, events: b.value }))
        : []

      const severityDist = sevRes.status === 'fulfilled'
        ? (sevRes.value.aggregation_results || []).map((b: { key: string; value: number }) => ({ 
            severity: b.key as 'Critical' | 'High' | 'Medium' | 'Low', 
            count: b.value 
          }))
        : []

      const topIps = topIpRes.status === 'fulfilled'
        ? (topIpRes.value.aggregation_results || []).map((b: { key: string; value: number }, _i: number, arr: { value: number }[]) => {
            const max = Math.max(...arr.map(x => x.value))
            return { ip: b.key, events: b.value, percentage: max > 0 ? Math.round((b.value / max) * 100) : 0 }
          })
        : []

      setData({
        kpis: {
          total_events: safeTotal(timeRes), // timeRes total is all events
          failed_logins: safeTotal(failedRes),
          critical_high_alerts: safeTotal(critRes),
          top_source_ip: topIps.length > 0 ? topIps[0].ip : 'N/A',
        },
        events_over_time: eventsOverTime,
        severity_distribution: severityDist,
        top_source_ips: topIps,
      })
    
      setLastUpdated(new Date())
      setLoading(false)
    } finally {
      if (!signal?.aborted) {
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!canFetchDashboard) {
      return
    }

    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData(controller.signal)

    return () => controller.abort()
  }, [canFetchDashboard, fetchData])

  useEffect(() => {
    if (!canFetchDashboard) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (refreshingRef.current) {
        return
      }

      intervalAbortRef.current?.abort()
      const controller = new AbortController()
      intervalAbortRef.current = controller
      void fetchData(controller.signal)
    }, DASHBOARD_REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      intervalAbortRef.current?.abort()
      intervalAbortRef.current = null
    }
  }, [canFetchDashboard, fetchData])

  return (
    <main className="flex h-full min-h-0 flex-col overflow-y-auto bg-[radial-gradient(circle_at_82%_4%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_20%_92%,rgba(255,45,85,0.08),transparent_30%),#071018] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(34,211,238,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.035)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-2.5 sm:px-5 lg:px-5">
        {/* Header */}
        <header className="mb-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-400/12 shadow-[0_0_24px_-10px_rgba(34,211,238,0.95)]">
              <LayoutDashboard className="size-5 text-cyan-300" />
            </div>
            <div className="flex flex-col items-start gap-0.2">
              <h1 className="mt-1 text-xl font-semibold leading-none tracking-tight text-zinc-50 drop-shadow-[0_0_14px_rgba(34,211,238,0.28)]">
                SOC Overview
              </h1>
              <span className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 mt-0.5">
                Last 24h
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/10 bg-zinc-950/25 px-2 py-1.5 backdrop-blur">
            <span className="hidden items-center gap-1.5 text-xs text-cyan-100/60 sm:inline-flex">
              <Clock3 className="size-3.5 text-cyan-400/70" />
              Auto refresh every 3 minutes
            </span>
            {lastUpdated && (
              <span className="hidden text-xs text-zinc-400 sm:inline">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => {
                if (canFetchDashboard) void fetchData()
              }}
              disabled={refreshing || !canFetchDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition-colors hover:border-cyan-300/45 hover:bg-cyan-400/18 disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {visibleError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 px-5 py-4 text-sm text-rose-200">
            {visibleError}
          </div>
        ) : loading || !data ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-zinc-500 animate-pulse">Loading dashboard metrics...</p>
          </div>
        ) : (
          <>
            {/* Overview */}
            <section className="mb-2.5 grid min-w-0 grid-cols-1 gap-2.5 xl:grid-cols-3">
              <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:col-span-2">
                <KpiCards data={data.kpis} />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <SeverityDistribution data={data.severity_distribution} />
              </div>
            </section>

            {/* Investigation widgets */}
            <section className="grid min-w-0 grid-cols-1 gap-2.5 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <EventsOverTime data={data.events_over_time} />
              </div>
              <div className="min-w-0 xl:col-span-1">
                <TopSourceIps data={data.top_source_ips} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
