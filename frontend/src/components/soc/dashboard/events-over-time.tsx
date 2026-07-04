import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { EventsOverTimePoint } from "@/types/soc"
import {
  createLocalChartTickFormatter,
  formatLocalChartTooltipLabel,
} from "@/lib/chart-time-format"

export function EventsOverTime({ data }: { data: EventsOverTimePoint[] }) {
  const tickFormatter = createLocalChartTickFormatter(data, "timestamp")

  return (
    <div className="flex h-full min-w-0 flex-col rounded-md border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Events Over Time</h2>
        </div>
      </div>

      <div className="min-h-[300px] min-w-0 flex-1 p-5">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-zinc-800 bg-gradient-to-b from-cyan-500/5 via-zinc-950/40 to-transparent">
            <p className="text-sm text-zinc-500">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={280}
            initialDimension={{ width: 900, height: 280 }}
          >
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#3f3f46"
                opacity={0.4}
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
                labelFormatter={formatLocalChartTooltipLabel}
                formatter={(value) => [value, "Events"]}
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  color: "#f4f4f5",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                }}
                itemStyle={{ color: "#22d3ee", fontWeight: 500 }}
                labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
              />
              <Line
                type="monotone"
                dataKey="events"
                stroke="#22d3ee"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#22d3ee", stroke: "#18181b", strokeWidth: 2 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
