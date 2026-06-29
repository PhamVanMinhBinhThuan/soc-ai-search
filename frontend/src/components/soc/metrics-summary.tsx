import {
  Activity,
  ChevronDown,
  ChevronUp,
  Database,
  Gauge,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { SearchMode } from '@/types/soc'

const metricStyles = [
  {
    icon: Gauge,
    iconClass: 'text-cyan-300 bg-cyan-400/10 ring-cyan-400/25',
  },
  {
    icon: Activity,
    iconClass: 'text-rose-300 bg-rose-400/10 ring-rose-400/25',
  },
  {
    icon: ShieldCheck,
    iconClass: 'text-emerald-300 bg-emerald-400/10 ring-emerald-400/25',
  },
  {
    icon: Sparkles,
    iconClass: 'text-violet-300 bg-violet-400/10 ring-violet-400/25',
  },
  {
    icon: Database,
    iconClass: 'text-sky-300 bg-sky-400/10 ring-sky-400/25',
  },
]

export function MetricsSummaryCards({
  mode,
  total,
  llmLatencyMs,
  searchLatencyMs,
}: {
  mode: SearchMode
  total: number
  llmLatencyMs: number
  searchLatencyMs: number
}) {
  const metrics = [
    {
      label: 'Query Type',
      value: mode.toUpperCase(),
      hint: mode === 'search' ? 'event list response' : 'bucket response',
    },
    {
      label: 'Total Events',
      value: total.toLocaleString('en-US'),
      hint: 'matched documents',
    },
    {
      label: 'SearchPlan',
      value: 'VALIDATED',
      hint: 'guardrails passed',
    },
    {
      label: 'LLM Latency',
      value: `${llmLatencyMs}ms`,
      hint: 'NL -> SearchPlan',
    },
    {
      label: 'Execution',
      value: `${searchLatencyMs}ms`,
      hint: 'Elasticsearch query',
    },
  ]
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((metric, index) => {
          const meta = metricStyles[index]
          const Icon = meta.icon
          return (
            <Card
              key={metric.label}
              className="min-w-0 flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 py-3"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ${meta.iconClass}`}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  {metric.label}
                </span>
                <span
                  className={
                    metric.value === 'VALIDATED'
                      ? 'block truncate font-mono text-base font-semibold text-emerald-300'
                      : 'block truncate font-mono text-base font-semibold text-foreground'
                  }
                >
                  {metric.value}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {metric.hint}
                </span>
              </span>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export function AiSummaryCard({
  summary,
  isMockMode,
}: {
  summary: string
  isMockMode: boolean
}) {
  const [expanded, setExpanded] = useState(true)
  const summaryLabel = isMockMode
    ? 'Mock AI Summary'
    : 'AI Summary'
  const ToggleIcon = expanded ? ChevronUp : ChevronDown

  return (
    <section className="space-y-3">
      <div className="ai-summary-glow relative overflow-hidden rounded-xl p-px">
        <div className="relative rounded-[11px] bg-card/95 px-4 py-3 backdrop-blur-sm">
          <div className={expanded ? 'mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold' : 'flex flex-wrap items-center gap-2 text-sm font-semibold'}>
            <Sparkles className="size-4 text-violet-300" />
            {summaryLabel}
            <span className="hidden flex-1 sm:block" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse AI summary' : 'Expand AI summary'}
              onClick={() => setExpanded((current) => !current)}
            >
              <ToggleIcon className="size-4" />
            </Button>
          </div>
          {expanded ? (
            <p className="text-sm leading-6 text-foreground/85">{summary}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
