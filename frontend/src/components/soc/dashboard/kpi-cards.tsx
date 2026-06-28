import { Activity, AlertTriangle, Globe, ShieldAlert, type LucideIcon } from "lucide-react"
import type { KpiData } from "@/types/soc"

export function KpiCards({ data }: { data: KpiData }) {
  const kpis: {
    label: string
    value: string
    icon: LucideIcon
    valueClass: string
    iconClass: string
    glow: string
  }[] = [
    {
      label: "Events",
      value: data.total_events.toLocaleString(),
      icon: Activity,
      valueClass: "text-zinc-50",
      iconClass: "text-cyan-400",
      glow: "hover:border-cyan-500/40 hover:shadow-[0_0_25px_-8px_rgba(34,211,238,0.45)]",
    },
    {
      label: "Critical / High Events",
      value: data.critical_high_alerts.toLocaleString(),
      icon: AlertTriangle,
      valueClass: "text-rose-500",
      iconClass: "text-rose-500",
      glow: "hover:border-rose-500/40 hover:shadow-[0_0_25px_-8px_rgba(244,63,94,0.45)]",
    },
    {
      label: "Top Source IP",
      value: data.top_source_ip,
      icon: Globe,
      valueClass: "text-zinc-50 font-mono text-xl",
      iconClass: "text-cyan-400",
      glow: "hover:border-cyan-500/40 hover:shadow-[0_0_25px_-8px_rgba(34,211,238,0.45)]",
    },
    {
      label: "Failed Logins",
      value: data.failed_logins.toLocaleString(),
      icon: ShieldAlert,
      valueClass: "text-amber-500",
      iconClass: "text-amber-500",
      glow: "hover:border-amber-500/40 hover:shadow-[0_0_25px_-8px_rgba(245,158,11,0.45)]",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className={`group rounded-md border border-zinc-800 bg-zinc-900 p-4 transition-all duration-200 ${kpi.glow}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{kpi.label}</p>
              <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-1.5">
                <Icon className={`h-4 w-4 ${kpi.iconClass}`} strokeWidth={2} />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-semibold tabular-nums ${kpi.valueClass}`}>{kpi.value}</p>
          </div>
        )
      })}
    </div>
  )
}
