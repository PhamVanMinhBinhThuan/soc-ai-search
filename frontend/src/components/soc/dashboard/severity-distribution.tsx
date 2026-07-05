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
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-[#252A33] bg-[#111318] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="shrink-0 border-b border-[#252A33] px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Severity Distribution</h2>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-4">
        {data.length === 0 ? (
          <p className="text-sm text-zinc-500">No data available</p>
        ) : (
          <>
            <div className="relative flex h-32 min-h-32 w-full min-w-0 shrink-0 items-center justify-center">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={128}
                initialDimension={{ width: 280, height: 128 }}
              >
                <PieChart>
                  <Pie
                    data={orderedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={64}
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
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "6px",
                      color: "#f4f4f5",
                    }}
                    itemStyle={{ fontWeight: 500 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-semibold tabular-nums text-zinc-50">
                  {total.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                  Events
                </span>
              </div>
            </div>

            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              {orderedData.map((item) => {
                const key = capitalize(item.severity)
                return (
                  <div key={item.severity} className="flex items-center justify-between gap-2 rounded-full border border-zinc-800/80 bg-zinc-950/45 px-2.5 py-1.5">
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
