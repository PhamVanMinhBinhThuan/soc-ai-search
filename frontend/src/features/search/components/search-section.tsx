import {
  BookOpen,
  History,
  LoaderCircle,
  Pin,
  Search,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import type { MockScenario } from '@/shared/types/soc'

export function SearchSection({
  question,
  scenarios,
  isLoading,
  isMockMode,
  onQuestionChange,
  onSubmitQuestion,
  onSelectSuggestion,
  currentQueryId,
  isPinned,
  onTogglePin,
  canPin = true,
  focusSignal = 0,
  onOpenQueryLibrary,
  onOpenRecentQueries,
}: {
  question: string
  scenarios: MockScenario[]
  isLoading: boolean
  isMockMode: boolean
  onQuestionChange: (question: string) => void
  onSubmitQuestion: (question: string) => void
  onSelectSuggestion: (question: string) => void
  currentQueryId?: string | null
  isPinned?: boolean
  onTogglePin?: (pinned: boolean) => void
  canPin?: boolean
  focusSignal?: number
  onOpenQueryLibrary?: () => void
  onOpenRecentQueries?: () => void
}) {
  const canSubmit = question.trim().length > 0 && !isLoading
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const latestQuestionRef = useRef(question)

  useEffect(() => {
    latestQuestionRef.current = question
  }, [question])

  useEffect(() => {
    if (focusSignal > 0) {
      const input = textareaRef.current
      input?.focus()
      const end = latestQuestionRef.current.length
      input?.setSelectionRange(end, end)
    }
  }, [focusSignal])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSubmit) {
      onSubmitQuestion(question)
    }
  }

  const handleQuestionKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      if (canSubmit) {
        onSubmitQuestion(question)
      }
    }
  }

  return (
    <section className="space-y-3" aria-label="AI event search">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl border border-cyan-400/35 bg-cyan-400/12 text-cyan-100 shadow-[0_0_24px_-12px_#22d3ee]">
          <Sparkles className="size-4" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">
          SOC Event Search Console
        </h1>
      </div>

      <div className="group relative overflow-hidden rounded-[1.4rem] border border-cyan-400/25 bg-[#0b1220]/80 p-4 shadow-[0_0_36px_-24px_#22d3ee,0_0_72px_-52px_#a855f7] backdrop-blur transition focus-within:border-cyan-300/60 focus-within:shadow-[0_0_44px_-20px_#22d3ee,0_0_84px_-46px_#a855f7]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_92%_18%,rgba(168,85,247,0.14),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(34,211,238,0.42)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.42)_1px,transparent_1px)] [background-size:28px_28px]" />

        <form onSubmit={handleSubmit} className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border border-cyan-400/20 bg-slate-800/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_-22px_#22d3ee] transition focus-within:border-cyan-300/55 focus-within:bg-cyan-950/20">
            <Search className="mt-3 hidden size-4 shrink-0 text-slate-400 sm:block" />
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              aria-label="Natural language search question"
              placeholder="Ask about SOC events, e.g. Show the top 5 source IPs with the most events in the last 30 days"
              className="min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-2 text-sm leading-5 text-slate-50 shadow-none placeholder:text-slate-500 focus-visible:ring-0"
            />
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {currentQueryId && canPin && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onTogglePin?.(!isPinned)}
                className={`h-10 border px-3 ${isPinned ? 'border-amber-300/45 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_-10px_#f59e0b] hover:bg-amber-400/20' : 'border-cyan-400/20 bg-zinc-950/70 text-slate-400 hover:border-cyan-300/45 hover:bg-cyan-400/10 hover:text-cyan-100'}`}
                title={isPinned ? 'Unpin this query' : 'Pin this query to Investigations'}
              >
                <Pin className={`size-4 ${isPinned ? 'fill-current' : ''}`} />
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canSubmit}
              title="Run natural-language search"
              className="h-10 rounded-xl border border-cyan-200/35 bg-cyan-400/90 px-5 text-sm font-semibold text-slate-950 shadow-[0_0_22px_-12px_#22d3ee] hover:border-cyan-100/70 hover:bg-cyan-300 disabled:opacity-55"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Search />
              )}
              {isLoading
                ? 'Searching...'
                : isMockMode
                  ? 'Run Mock'
                  : 'Search'}
            </Button>
          </div>
        </form>

        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Suggested:</span>
          {scenarios.map((scenario) => (
            <button
              key={scenario.question}
              type="button"
              aria-pressed={question === scenario.question}
              disabled={isLoading}
              onClick={() => onSelectSuggestion(scenario.question)}
              className={
                question === scenario.question
                  ? 'rounded-full border border-violet-300/50 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-100 shadow-[0_0_18px_-12px_#a78bfa]'
                  : 'rounded-full border border-cyan-400/15 bg-cyan-950/20 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-cyan-300/45 hover:bg-cyan-400/10 hover:text-cyan-100'
              }
            >
              {scenario.shortLabel}
            </button>
          ))}
          {onOpenQueryLibrary && (
            <button
              type="button"
              aria-label="View queries"
              onClick={onOpenQueryLibrary}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/45 bg-cyan-400/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-[0_0_20px_-10px_#22d3ee] transition-colors hover:border-cyan-200/60 hover:bg-cyan-400/25"
            >
              <BookOpen className="size-3" />
              View queries
            </button>
          )}
          {onOpenRecentQueries && (
            <button
              type="button"
              aria-label="Recent Queries"
              onClick={onOpenRecentQueries}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/40 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-cyan-50 shadow-[0_0_20px_-12px_#22d3ee] transition-colors hover:border-cyan-200/60 hover:bg-cyan-400/15 hover:text-white"
            >
              <History className="size-3" />
              Recent Queries
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
