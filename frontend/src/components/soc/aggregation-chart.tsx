import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type {
  AggregationResultItemDto,
  ChartMetadataDto,
} from '@/types/soc'
import {
  createLocalChartTickFormatter,
  formatLocalChartTooltipLabel,
} from '@/lib/chart-time-format'

type TooltipPayload = {
  dataKey?: string | number
  value?: number | string
}

function EventCountTooltip({
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

  const eventValue = payload.find((item) => item.dataKey === 'value')?.value

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-[#111318]/95 px-3 py-2 text-sm shadow-[0_0_28px_-14px_rgba(34,211,238,0.95),0_10px_30px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
      <p className="mb-1 text-slate-300">{formatLocalChartTooltipLabel(label)}</p>
      <p className="font-semibold text-cyan-300">
        Events: {Number(eventValue ?? 0).toLocaleString()}
      </p>
    </div>
  )
}

export function AggregationChart({
  data,
  metadata,
}: {
  data: AggregationResultItemDto[]
  metadata?: ChartMetadataDto
}) {
  const lineTickFormatter = createLocalChartTickFormatter(data, 'key')

  if (metadata?.chart_type === 'NUMBER') {
    return (
      <div className="grid h-80 place-items-center rounded-xl border border-border bg-background/25">
        <div className="text-center">
          <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Total Events
          </span>
          <strong className="mt-2 block font-mono text-6xl text-cyan-300">
            {(data[0]?.value ?? 0).toLocaleString('en-US')}
          </strong>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-80 min-h-80 min-w-0 w-full overflow-hidden rounded-2xl border border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.07),rgba(8,10,15,0.7))] p-4 shadow-[0_0_28px_-18px_rgba(34,211,238,0.85),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={280}
        initialDimension={{ width: 1200, height: 280 }}
      >
        {metadata?.chart_type === 'LINE' ? (
          <AreaChart data={data} margin={{ top: 15, right: 12, left: -12 }}>
            <defs>
              <linearGradient id="searchColorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.38} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
              <filter id="searchLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke="#164e63" opacity={0.42} />
            <XAxis
              dataKey="key"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              minTickGap={30}
              tickFormatter={lineTickFormatter}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <Tooltip
              content={<EventCountTooltip />}
              cursor={{ stroke: '#e2e8f0', strokeOpacity: 0.65 }}
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="none"
              fill="url(#searchColorEvents)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke="#22d3ee"
              strokeWidth={3}
              filter="url(#searchLineGlow)"
              isAnimationActive={false}
              dot={{ fill: '#22d3ee', r: 3 }}
              activeDot={{ r: 5, fill: '#22d3ee', stroke: '#111318', strokeWidth: 2 }}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 24, right: 12, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="key"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--secondary)', opacity: 0.45 }}
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
            <Bar
              dataKey="value"
              fill="var(--critical)"
              isAnimationActive={false}
              radius={[6, 6, 0, 0]}
            >
              <LabelList
                dataKey="value"
                position="top"
                fill="var(--muted-foreground)"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
