import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import type { SeverityDistributionItem } from "@/types/soc"

const COLORS = {
  Critical: "#f43f5e", // rose-500
  High: "#f59e0b",     // amber-500
  Medium: "#22d3ee",   // cyan-400
  Low: "#71717a",      // zinc-500
}

const TEXT_COLORS = {
  Critical: "text-rose-400",
  High: "text-amber-400",
  Medium: "text-cyan-300",
  Low: "text-zinc-400",
}

const DOT_COLORS = {
  Critical: "bg-rose-500",
  High: "bg-amber-500",
  Medium: "bg-cyan-400",
  Low: "bg-zinc-500",
}

const SEVERITY_ORDER = ["Critical", "High", "Medium", "Low"] as const

function capitalize(s: string): keyof typeof COLORS {
  return (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()) as keyof typeof COLORS
}

export function SeverityDistribution({ data }: { data: SeverityDistributionItem[] }) {
  const orderedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aIndex = SEVERITY_ORDER.indexOf(capitalize(a.severity))
      const bIndex = SEVERITY_ORDER.indexOf(capitalize(b.severity))
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
    })
  }, [data])

  const total = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0)
  }, [data])

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-violet-400/35 bg-[linear-gradient(180deg,rgba(168,85,247,0.10),rgba(17,19,24,0.92))] shadow-[0_0_30px_-18px_rgba(168,85,247,0.85),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_18%,rgba(34,211,238,0.13),transparent_28%)]" />
      <div className="relative shrink-0 border-b border-violet-400/20 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-zinc-100">Severity Distribution</h2>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-2.5">
        {data.length === 0 ? (
          <p className="text-sm text-zinc-500">No data available</p>
        ) : (
          <>
            <div className="relative flex h-[120px] min-h-[120px] w-full min-w-0 shrink-0 items-center justify-center">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={120}
                initialDimension={{ width: 280, height: 120 }}
              >
                <PieChart>
                  <Pie
                    data={orderedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="severity"
                    stroke="none"
                  >
                    {orderedData.map((entry) => {
                      const key = capitalize(entry.severity)
                      return <Cell key={entry.severity} fill={COLORS[key] ?? "#52525b"} />
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111318",
                      border: "1px solid rgba(34,211,238,0.22)",
                      borderRadius: "12px",
                      color: "#f4f4f5",
                      boxShadow: "0 0 24px -16px rgba(34,211,238,0.9)",
                    }}
                    itemStyle={{ fontWeight: 500 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold tabular-nums text-zinc-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]">
                  {total.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Events
                </span>
              </div>
            </div>

            <div className="mt-3 grid w-full grid-cols-2 gap-2">
              {orderedData.map((item) => {
                const key = capitalize(item.severity)
                return (
                  <div key={item.severity} className="flex items-center justify-between gap-2 rounded-full border border-white/10 bg-zinc-950/50 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${DOT_COLORS[key] ?? "bg-zinc-500"}`} />
                      <span className="text-xs text-zinc-400">{key}</span>
                    </div>
                    <span className={`text-xs font-medium tabular-nums ${TEXT_COLORS[key] ?? "text-zinc-400"}`}>
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
