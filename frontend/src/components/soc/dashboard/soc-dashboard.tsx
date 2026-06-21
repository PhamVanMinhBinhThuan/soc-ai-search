import { useEffect, useState } from "react"
import { RefreshCcw, LayoutDashboard } from "lucide-react"
import { KpiCards } from "./kpi-cards"
import { EventsOverTime } from "./events-over-time"
import { SeverityDistribution } from "./severity-distribution"
import { TopSourceIps } from "./top-source-ips"
import type { DashboardMetricsDto } from "@/types/soc"

// Mock data to simulate API response
const MOCK_DASHBOARD_DATA: DashboardMetricsDto = {
  kpis: {
    total_events: 1946,
    critical_high_alerts: 482,
    top_source_ip: "203.0.113.45",
    failed_logins: 312,
  },
  events_over_time: Array.from({ length: 24 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toISOString(),
    events: Math.floor(Math.random() * 500) + 100,
  })),
  severity_distribution: [
    { severity: "Critical", count: 186 },
    { severity: "High", count: 296 },
    { severity: "Medium", count: 742 },
    { severity: "Low", count: 722 },
  ],
  top_source_ips: [
    { ip: "203.0.113.45", events: 874, percentage: 100 },
    { ip: "198.51.100.22", events: 612, percentage: 70 },
    { ip: "192.0.2.178", events: 433, percentage: 50 },
    { ip: "203.0.113.91", events: 287, percentage: 33 },
    { ip: "198.51.100.7", events: 154, percentage: 18 },
  ],
}

export function SocDashboard() {
  const [data, setData] = useState<DashboardMetricsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    // Simulate API call
    setRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setData(MOCK_DASHBOARD_DATA)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [])

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
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            Refresh
          </button>
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
