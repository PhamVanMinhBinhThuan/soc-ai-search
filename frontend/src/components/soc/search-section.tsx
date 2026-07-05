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

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { MockScenario } from '@/types/soc'

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

  useEffect(() => {
    if (focusSignal > 0) {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(question.length, question.length)
    }
  }, [focusSignal, question.length])

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
      <form
        onSubmit={handleSubmit}
        className="group relative overflow-hidden rounded-[1.4rem] border border-cyan-400/35 bg-cyan-400/10 p-px shadow-[0_0_36px_-22px_#22d3ee,0_0_70px_-46px_#a855f7] transition focus-within:border-cyan-300/70 focus-within:shadow-[0_0_42px_-18px_#22d3ee,0_0_80px_-42px_#a855f7]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(34,211,238,0.18),rgba(168,85,247,0.08)_45%,rgba(255,45,85,0.08))]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(34,211,238,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.45)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex flex-col gap-3 rounded-[1.35rem] bg-[#09111a]/95 p-3.5 backdrop-blur sm:flex-row sm:items-start sm:p-4">
          <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-2xl border border-violet-300/35 bg-violet-500/20 text-violet-100 shadow-[0_0_24px_-10px_#a78bfa]">
            <Sparkles className="size-4" />
          </div>
          <Textarea
            ref={textareaRef}
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            aria-label="Natural language search question"
            className="min-h-20 min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-base leading-7 text-slate-50 shadow-none placeholder:text-slate-500 focus-visible:ring-0"
          />
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              {currentQueryId && canPin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onTogglePin?.(!isPinned)}
                  className={`border px-3 ${isPinned ? 'border-amber-300/45 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_-10px_#f59e0b] hover:bg-amber-400/20' : 'border-cyan-400/20 bg-zinc-950/70 text-slate-400 hover:border-cyan-300/45 hover:bg-cyan-400/10 hover:text-cyan-100'}`}
                  title={isPinned ? 'Unpin this query' : 'Pin this query to Investigations'}
                >
                  <Pin className={`size-4 ${isPinned ? 'fill-current' : ''}`} />
                </Button>
              )}
              <Button
                type="submit"
                disabled={!canSubmit}
                title="Run natural-language search"
                className="h-11 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-5 font-semibold text-white shadow-[0_0_24px_-8px_#a78bfa] hover:from-violet-400 hover:to-cyan-300 disabled:opacity-55"
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
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cyan-400/15 bg-zinc-950/35 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-300/45 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            <History className="size-3" />
            Recent Queries
          </button>
        )}
      </div>
    </section>
  )
}
