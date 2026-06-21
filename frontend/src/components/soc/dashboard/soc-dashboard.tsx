import { useEffect, useState } from "react"
import { RefreshCcw, LayoutDashboard } from "lucide-react"
import { KpiCards } from "./kpi-cards"
import { EventsOverTime } from "./events-over-time"
import { SeverityDistribution } from "./severity-distribution"
import { TopSourceIps } from "./top-source-ips"
import type { DashboardMetricsDto, SearchPlanDto, SearchPlanResponseDto } from "@/types/soc"
import { executeSearchPlan } from "@/services/search-api"

// Mock data to simulate API response


export function SocDashboard() {
  const [data, setData] = useState<DashboardMetricsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async (signal?: AbortSignal) => {
    setRefreshing(true)
    
    // We run 5 queries
    const failedLoginsPlan: SearchPlanDto = {
      mode: 'search',
      page: 0,
      size: 0,
      message_query: null,
      aggregation: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' }, event_type: ['failed_login'] },
    }
    const criticalPlan: SearchPlanDto = {
      mode: 'search',
      page: 0,
      size: 0,
      message_query: null,
      aggregation: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' }, severity: ['critical', 'high'] },
    }
    const timePlan: SearchPlanDto = {
      mode: 'aggregation',
      page: 0,
      size: 0,
      message_query: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' } },
      aggregation: { type: 'date_histogram', interval: 'hour' },
    }
    const severityPlan: SearchPlanDto = {
      mode: 'aggregation',
      page: 0,
      size: 0,
      message_query: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' } },
      aggregation: { type: 'group_by', field: 'severity', top_n: 10 },
    }
    const topIpPlan: SearchPlanDto = {
      mode: 'aggregation',
      page: 0,
      size: 0,
      message_query: null,
      filters: { timestamp: { from: 'now-24h', to: 'now' } },
      aggregation: { type: 'top_n', field: 'ip', top_n: 10 },
    }

    const [failedRes, critRes, timeRes, sevRes, topIpRes] = await Promise.allSettled([
      executeSearchPlan(failedLoginsPlan, signal),
      executeSearchPlan(criticalPlan, signal),
      executeSearchPlan(timePlan, signal),
      executeSearchPlan(severityPlan, signal),
      executeSearchPlan(topIpPlan, signal),
    ])

    if (signal?.aborted) return

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
    setRefreshing(false)
  }

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData(controller.signal)

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      void fetchData()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [autoRefresh])

  return (
    <main className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
              <LayoutDashboard className="size-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
                SOC Overview
              </h1>
              <p className="text-sm text-zinc-500">
                Real-time security telemetry and alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)} 
                className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/30"
              />
              Auto-refresh 10m
            </label>
            {lastUpdated && (
              <span className="text-xs text-zinc-500 hidden sm:inline">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => fetchData()}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 disabled:opacity-50"
            >
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {loading || !data ? (
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
