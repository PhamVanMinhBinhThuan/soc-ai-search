import {
  Area,
  AreaChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { EventsOverTimePoint } from "@/shared/types/soc"
import {
  createLocalChartTickFormatter,
  formatLocalChartTooltipLabel,
} from "@/shared/lib/chart-time-format"

type TooltipPayload = {
  dataKey?: string | number
  value?: number | string
}

function EventsTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: unknown
  payload?: TooltipPayload[]
}) {
  if (!active || !payload?.length) {
    return null
  }

  const eventValue = payload.find((item) => item.dataKey === "events")?.value

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-[#111318]/95 px-3 py-2 text-sm shadow-[0_0_28px_-14px_rgba(34,211,238,0.95),0_10px_30px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
      <p className="mb-1 text-slate-300">
        {formatLocalChartTooltipLabel(label)}
      </p>
      <p className="font-semibold text-cyan-300">
        Events: {Number(eventValue ?? 0).toLocaleString()}
      </p>
    </div>
  )
}

export function EventsOverTime({ data }: { data: EventsOverTimePoint[] }) {
  const tickFormatter = createLocalChartTickFormatter(data, "timestamp")

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-cyan-400/35 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(17,19,24,0.92))] shadow-[0_0_30px_-18px_rgba(34,211,238,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.055)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
      <div className="relative flex shrink-0 items-center justify-between border-b border-cyan-400/20 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Events Over Time</h2>
        </div>
      </div>

      <div className="relative min-h-[202px] min-w-0 flex-1 p-2.5">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-zinc-800 bg-gradient-to-b from-cyan-500/5 via-zinc-950/40 to-transparent">
            <p className="text-sm text-zinc-500">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={202}
            initialDimension={{ width: 760, height: 202 }}
          >
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="dashboardColorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <filter id="dashboardLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#164e63"
                opacity={0.42}
              />
              <XAxis
                dataKey="timestamp"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickMargin={12}
                minTickGap={30}
                tickFormatter={tickFormatter}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#a1a1aa", fontSize: 12 }}
                tickFormatter={(value) => `${value}`}
                width={40}
              />
              <Tooltip
                content={<EventsTooltip />}
                cursor={{ stroke: "#e2e8f0", strokeOpacity: 0.65 }}
              />
              <Area
                type="monotone"
                dataKey="events"
                stroke="none"
                fill="url(#dashboardColorEvents)"
                fillOpacity={1}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="events"
                stroke="#22d3ee"
                strokeWidth={2.8}
                filter="url(#dashboardLineGlow)"
                dot={false}
                activeDot={{ r: 4, fill: "#22d3ee", stroke: "#18181b", strokeWidth: 2 }}
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
