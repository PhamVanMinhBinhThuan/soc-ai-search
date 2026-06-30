import {
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

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
