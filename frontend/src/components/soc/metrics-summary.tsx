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
      <div className="relative overflow-hidden rounded-2xl border border-violet-300/25 bg-violet-500/10 p-px shadow-[0_0_32px_-20px_#a78bfa]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(168,85,247,0.2),rgba(34,211,238,0.07),transparent)]" />
        <div className="relative rounded-[15px] bg-[#0a111a]/95 px-4 py-3 backdrop-blur-sm">
          <div className={expanded ? 'mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-50' : 'flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-50'}>
            <span className="grid size-8 place-items-center rounded-xl border border-violet-300/30 bg-violet-500/15 text-violet-200">
              <Sparkles className="size-4" />
            </span>
            {summaryLabel}
            <span className="hidden flex-1 sm:block" />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-100"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse AI summary' : 'Expand AI summary'}
              onClick={() => setExpanded((current) => !current)}
            >
              <ToggleIcon className="size-4" />
            </Button>
          </div>
          {expanded ? (
            <p className="text-sm leading-6 text-slate-200">{summary}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
