import { Activity, AlertTriangle, Globe, ShieldAlert, type LucideIcon } from "lucide-react"
import type { KpiData } from "@/types/soc"

export function KpiCards({ data }: { data: KpiData }) {
  const kpis: {
    label: string
    value: string
    icon: LucideIcon
    valueClass: string
    iconClass: string
    panelClass: string
    iconPanelClass: string
  }[] = [
    {
      label: "Events",
      value: data.total_events.toLocaleString(),
      icon: Activity,
      valueClass: "text-zinc-50",
      iconClass: "text-cyan-400",
      panelClass: "border-cyan-400/40 bg-[linear-gradient(180deg,rgba(34,211,238,0.13),rgba(10,17,24,0.92))] shadow-[0_0_30px_-16px_rgba(34,211,238,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]",
      iconPanelClass: "border-cyan-400/35 bg-cyan-400/12 shadow-[0_0_18px_-8px_rgba(34,211,238,0.9)]",
    },
    {
      label: "Critical / High Events",
      value: data.critical_high_alerts.toLocaleString(),
      icon: AlertTriangle,
      valueClass: "text-rose-500",
      iconClass: "text-rose-500",
      panelClass: "border-rose-400/45 bg-[linear-gradient(180deg,rgba(244,63,94,0.13),rgba(18,13,18,0.92))] shadow-[0_0_30px_-16px_rgba(244,63,94,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]",
      iconPanelClass: "border-rose-400/35 bg-rose-500/12 shadow-[0_0_18px_-8px_rgba(244,63,94,0.9)]",
    },
    {
      label: "Top Source IP",
      value: data.top_source_ip,
      icon: Globe,
      valueClass: "text-zinc-50 font-mono text-xl",
      iconClass: "text-cyan-400",
      panelClass: "border-sky-400/35 bg-[linear-gradient(180deg,rgba(56,189,248,0.11),rgba(10,17,24,0.92))] shadow-[0_0_30px_-16px_rgba(56,189,248,0.8),inset_0_1px_0_rgba(255,255,255,0.08)]",
      iconPanelClass: "border-sky-400/35 bg-sky-400/12 shadow-[0_0_18px_-8px_rgba(56,189,248,0.9)]",
    },
    {
      label: "Failed Logins",
      value: data.failed_logins.toLocaleString(),
      icon: ShieldAlert,
      valueClass: "text-amber-500",
      iconClass: "text-amber-500",
      panelClass: "border-amber-400/35 bg-[linear-gradient(180deg,rgba(245,158,11,0.12),rgba(18,15,10,0.92))] shadow-[0_0_30px_-16px_rgba(245,158,11,0.85),inset_0_1px_0_rgba(255,255,255,0.08)]",
      iconPanelClass: "border-amber-400/35 bg-amber-400/12 shadow-[0_0_18px_-8px_rgba(245,158,11,0.9)]",
    },
  ]

  return (
    <>
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <div
            key={kpi.label}
            className={`group relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 ${kpi.panelClass}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.09)_1px,transparent_1px)] bg-[size:22px_22px] opacity-35" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="flex items-start justify-between">
              <p className="relative text-xs font-semibold uppercase tracking-wide text-cyan-50/70">{kpi.label}</p>
              <div className={`relative rounded-lg border p-1.5 ${kpi.iconPanelClass}`}>
                <Icon className={`h-4 w-4 ${kpi.iconClass}`} strokeWidth={2} />
              </div>
            </div>
            <p className={`relative mt-2.5 text-3xl font-bold tabular-nums drop-shadow-[0_0_10px_rgba(34,211,238,0.18)] ${kpi.valueClass}`}>{kpi.value}</p>
          </div>
        )
      })}
    </>
  )
}
