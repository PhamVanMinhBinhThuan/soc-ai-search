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

function capitalize(s: string): keyof typeof COLORS {
  return (s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()) as keyof typeof COLORS
}

export function SeverityDistribution({ data }: { data: SeverityDistributionItem[] }) {
  const total = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0)
  }, [data])

  return (
    <div className="flex h-full min-w-0 flex-col rounded-md border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-5 py-3.5 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">Severity Distribution</h2>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-5">
        {data.length === 0 ? (
          <p className="text-sm text-zinc-500">No data available</p>
        ) : (
          <>
            <div className="relative flex h-40 min-h-40 w-full min-w-0 shrink-0 items-center justify-center">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={160}
                initialDimension={{ width: 320, height: 160 }}
              >
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="severity"
                    stroke="none"
                  >
                    {data.map((entry) => {
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
                  Total
                </span>
              </div>
            </div>

            <div className="mt-5 grid w-full grid-cols-2 gap-x-4 gap-y-2.5">
              {data.map((item) => {
                const key = capitalize(item.severity)
                return (
                  <div key={item.severity} className="flex items-center justify-between gap-2">
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
