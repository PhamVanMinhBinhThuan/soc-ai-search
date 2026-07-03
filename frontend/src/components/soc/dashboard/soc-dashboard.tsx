import { useCallback, useEffect, useState } from "react"
import { RefreshCcw, LayoutDashboard } from "lucide-react"
import { KpiCards } from "./kpi-cards"
import { EventsOverTime } from "./events-over-time"
import { SeverityDistribution } from "./severity-distribution"
import { TopSourceIps } from "./top-source-ips"
import type { DashboardMetricsDto, SearchPlanDto, SearchPlanResponseDto } from "@/types/soc"
import { executeSearchPlan } from "@/services/search-api"
import { ApiError } from "@/services/api-client"

// Mock data to simulate API response


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
  const canFetchDashboard =
    !authEnabled || (!authLoading && authenticated && accessTokenReady)
  const authUnavailableMessage =
    authEnabled && !authLoading && !authenticated
      ? 'Please sign in to view dashboard metrics.'
      : null
  const visibleError = authUnavailableMessage ?? dashboardError

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
      const [failedRes, critRes, timeRes, sevRes, topIpRes] = await Promise.allSettled([
        executeSearchPlan(failedLoginsPlan, signal),
        executeSearchPlan(criticalPlan, signal),
        executeSearchPlan(timePlan, signal),
        executeSearchPlan(severityPlan, signal),
        executeSearchPlan(topIpPlan, signal),
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

  return (
    <main className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 mt-0.5">
              <LayoutDashboard className="size-5 text-cyan-300" />
            </div>
            <div className="flex flex-col items-start gap-0.2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-100 leading-none mt-1">
                SOC Overview
              </h1>
              <span className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 mt-0.5">
                Last 24h
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-zinc-500 hidden sm:inline">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => {
                if (canFetchDashboard) void fetchData()
              }}
              disabled={refreshing || !canFetchDashboard}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 disabled:opacity-50"
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
            {/* KPI Cards */}
            <div className="mb-4">
              <KpiCards data={data.kpis} />
            </div>

            {/* Main Charts */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <EventsOverTime data={data.events_over_time} />
              </div>
              <div className="lg:col-span-1">
                <SeverityDistribution data={data.severity_distribution} />
              </div>
            </div>

            {/* Bottom Widgets */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <TopSourceIps data={data.top_source_ips} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
