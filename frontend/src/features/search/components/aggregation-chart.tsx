import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type {
  AggregationResultItemDto,
  AggregationType,
  ChartMetadataDto,
} from '@/shared/types/soc'
import {
  createLocalChartTickFormatter,
  formatLocalChartTooltipLabel,
} from '@/shared/lib/chart-time-format'

type TooltipPayload = {
  dataKey?: string | number
  value?: number | string
  payload?: AggregationResultItemDto
}

const THREAT_RANKING_FIELDS = new Set(['ip', 'user', 'host', 'source'])
const RANK_COLORS = ['#FB3B66', '#F59E0B', '#22D3EE', '#A855F7', '#64748B']
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FB3B66',
  high: '#F59E0B',
  medium: '#22D3EE',
  low: '#64748B',
}

function formatNumber(value: number | string | undefined) {
  return Number(value ?? 0).toLocaleString('en-US')
}

function getBucketShare(value: number | string | undefined, total: number) {
  const numericValue = Number(value ?? 0)
  if (total <= 0) {
    return '0.0'
  }
  return ((numericValue / total) * 100).toFixed(1)
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

function BucketTooltip({
  active,
  label,
  payload,
  total,
}: {
  active?: boolean
  label?: unknown
  payload?: TooltipPayload[]
  total: number
}) {
  if (!active || !payload?.length) {
    return null
  }

  const value = payload.find((item) => item.dataKey === 'value')?.value

  return (
    <div className="rounded-xl border border-cyan-400/25 bg-[#111318]/95 px-3 py-2 text-sm shadow-[0_0_28px_-14px_rgba(34,211,238,0.95),0_10px_30px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
      <p className="mb-1 font-mono text-slate-200">{String(label)}</p>
      <p className="font-semibold text-cyan-300">
        Events: {formatNumber(value)}
      </p>
      <p className="text-xs text-slate-400">
        Share: {getBucketShare(value, total)}%
      </p>
    </div>
  )
}

function ThreatRankingChart({
  data,
}: {
  data: AggregationResultItemDto[]
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="relative min-h-80 min-w-0 w-full rounded-2xl border border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(8,10,15,0.72))] p-4 shadow-[0_0_28px_-18px_rgba(34,211,238,0.9),inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              Top Results
            </p>
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 font-mono text-[11px] text-cyan-100">
            {data.length} buckets
          </span>
        </div>

        {data.map((item, index) => {
          const color = RANK_COLORS[index] ?? RANK_COLORS[RANK_COLORS.length - 1]
          const width = `${Math.max((item.value / maxValue) * 100, 2)}%`
          const isTopRank = index === 0

          return (
            <div
              key={`${item.key}-${index}`}
              className={
                'rounded-2xl border p-3 transition ' +
                (isTopRank
                  ? 'border-rose-300/35 bg-rose-500/[0.075] shadow-[0_0_24px_-16px_rgba(251,59,102,0.9)]'
                  : 'border-cyan-400/12 bg-zinc-950/35')
              }
              title={`Rank ${index + 1}, ${item.key}, ${formatNumber(item.value)} events`}
              aria-label={`Rank ${index + 1}, ${item.key}, ${formatNumber(item.value)} events`}
            >
              <div className="mb-2 flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl border font-mono text-xs font-bold"
                  style={{
                    borderColor: `${color}66`,
                    backgroundColor: `${color}22`,
                    color,
                  }}
                >
                  #{index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-slate-100">
                  {item.key}
                </span>
                <span className="font-mono text-sm font-semibold text-cyan-200">
                  {formatNumber(item.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-950/85">
                <div
                  className="h-full rounded-full shadow-[0_0_16px_rgba(34,211,238,0.45)]"
                  style={{
                    width,
                    background: `linear-gradient(90deg, ${color}, #22D3EE)`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AggregationChart({
  data,
  metadata,
  aggregationField,
  aggregationType,
}: {
  data: AggregationResultItemDto[]
  metadata?: ChartMetadataDto
  aggregationField?: string | null
  aggregationType?: AggregationType | null
}) {
  const lineTickFormatter = createLocalChartTickFormatter(data, 'key')
  const totalValue = data.reduce((sum, item) => sum + item.value, 0)
  const useThreatRanking =
    metadata?.chart_type !== 'LINE' &&
    metadata?.chart_type !== 'NUMBER' &&
    aggregationType !== 'count' &&
    Boolean(aggregationField && THREAT_RANKING_FIELDS.has(aggregationField))

  if (metadata?.chart_type === 'NUMBER') {
    return (
      <div className="relative grid h-80 place-items-center overflow-hidden rounded-2xl border border-cyan-400/30 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_34%),#071018]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />
        <div className="text-center">
          <span className="text-xs tracking-[0.2em] text-cyan-200/80 uppercase">
            Total Events
          </span>
          <strong className="mt-2 block font-mono text-6xl text-cyan-200 drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
            {(data[0]?.value ?? 0).toLocaleString('en-US')}
          </strong>
        </div>
      </div>
    )
  }

  if (useThreatRanking) {
    return <ThreatRankingChart data={data} />
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
            <defs>
              {data.map((item, index) => {
                const severityColor = SEVERITY_COLORS[item.key.toLowerCase()]
                const color = severityColor ?? RANK_COLORS[index] ?? '#22D3EE'
                return (
                  <linearGradient
                    key={`bar-gradient-${item.key}`}
                    id={`searchBarGradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.98} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.55} />
                  </linearGradient>
                )
              })}
              <filter id="searchBarGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke="#164e63" opacity={0.35} />
            <XAxis
              dataKey="key"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              interval={0}
              minTickGap={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: '#22d3ee', opacity: 0.08 }}
              content={<BucketTooltip total={totalValue} />}
            />
            <Bar
              dataKey="value"
              isAnimationActive={false}
              radius={[8, 8, 0, 0]}
              filter="url(#searchBarGlow)"
            >
              {data.map((item, index) => {
                const severityColor = SEVERITY_COLORS[item.key.toLowerCase()]
                return (
                  <Cell
                    key={`bar-fill-${item.key}`}
                    fill={severityColor ?? `url(#searchBarGradient-${index})`}
                  />
                )
              })}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value) => formatNumber(value as number | string | undefined)}
                fill="#cbd5e1"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
