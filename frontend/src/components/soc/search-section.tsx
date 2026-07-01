import {
  LoaderCircle,
  Search,
  Sparkles,
  Pin,
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
        className="group relative overflow-hidden rounded-xl border border-border bg-card p-px focus-within:border-violet-400/50 focus-within:shadow-[0_0_30px_-10px_#a78bfa]"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-cyan-400/10 opacity-70" />
        <div className="relative flex flex-col gap-3 rounded-[11px] bg-card p-3 sm:flex-row sm:items-start">
          <div className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/25">
            <Sparkles className="size-4" />
          </div>
          <Textarea
            ref={textareaRef}
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            aria-label="Natural language search question"
            className="min-h-16 min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-sm leading-6 shadow-none focus-visible:ring-0"
          />
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="flex items-center gap-2">
              {currentQueryId && canPin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onTogglePin?.(!isPinned)}
                  className={`px-3 border-border ${isPinned ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800'}`}
                  title={isPinned ? 'Unpin this query' : 'Pin this query to Investigations'}
                >
                  <Pin className={`size-4 ${isPinned ? 'fill-current' : ''}`} />
                </Button>
              )}
              <Button
                type="submit"
                disabled={!canSubmit}
                title="Run natural-language search"
                className="bg-violet-500 text-white shadow-[0_0_18px_-6px_#a78bfa] hover:bg-violet-400"
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Suggested:</span>
        {scenarios.map((scenario) => (
          <button
            key={scenario.question}
            type="button"
            aria-pressed={question === scenario.question}
            disabled={isLoading}
            onClick={() => onSelectSuggestion(scenario.question)}
            className={
              question === scenario.question
                ? 'rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-xs text-violet-200'
                : 'rounded-full border border-border bg-secondary/45 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-cyan-400/30 hover:text-foreground'
            }
          >
            {scenario.shortLabel}
          </button>
        ))}
      </div>
    </section>
  )
}
