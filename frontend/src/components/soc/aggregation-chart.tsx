import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type {
  AggregationResultItemDto,
  ChartMetadataDto,
} from '@/types/soc'

export function AggregationChart({
  data,
  metadata,
}: {
  data: AggregationResultItemDto[]
  metadata?: ChartMetadataDto
}) {
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
    <div className="h-80 min-h-80 min-w-0 w-full rounded-xl border border-border bg-background/20 p-4">
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={280}
        initialDimension={{ width: 1200, height: 280 }}
      >
        {metadata?.chart_type === 'LINE' ? (
          <LineChart data={data} margin={{ top: 15, right: 12, left: -12 }}>
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
              contentStyle={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--ai-alt)"
              strokeWidth={3}
              isAnimationActive={false}
              dot={{ fill: 'var(--ai-alt)', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
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
