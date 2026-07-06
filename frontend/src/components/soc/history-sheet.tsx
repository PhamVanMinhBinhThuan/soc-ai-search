import {
  BarChart3,
  Clock3,
  ExternalLink,
  Database,
  History,
  LoaderCircle,
  Play,
  RotateCw,
  SearchX,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { KeyboardEvent, MouseEvent } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuestionForList } from '@/lib/audit-question-format'
import { cn } from '@/lib/utils'
import type {
  HistoryStatus,
  SearchHistoryItemDto,
  SearchHistoryPageDto,
  UiError,
} from '@/types/soc'

function formatCreatedAt(value: string) {
  const date = new Date(value)
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  return `${dateStr} ${timeStr}`
}

function modeBadgeClass(mode: SearchHistoryItemDto['mode']) {
  if (mode === 'search') {
    return 'border-cyan-300/25 bg-cyan-400/12 text-cyan-200'
  }

  if (mode === 'aggregation') {
    return 'border-violet-300/25 bg-violet-400/14 text-violet-200'
  }

  return 'border-slate-600 bg-slate-800/70 text-slate-400'
}

function statusBadgeClass(status: SearchHistoryItemDto['status']) {
  return status === 'SUCCESS'
    ? 'border-emerald-300/25 bg-emerald-400/12 text-emerald-200'
    : 'border-rose-300/25 bg-rose-400/12 text-rose-200'
}

function HistorySkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-500/20 bg-slate-800/35 p-3">
      <div className="flex gap-4">
        <Skeleton className="size-10 shrink-0 rounded-xl bg-zinc-800/80" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-4/5 bg-zinc-800/80" />
            <Skeleton className="h-4 w-2/3 bg-zinc-800/80" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-16 rounded-full bg-zinc-800/80" />
            <Skeleton className="h-5 w-20 rounded-full bg-zinc-800/80" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-3 w-32 bg-zinc-800/80" />
            <Skeleton className="h-3 w-20 bg-zinc-800/80" />
            <Skeleton className="h-3 w-24 bg-zinc-800/80" />
          </div>
        </div>
        <Skeleton className="size-9 shrink-0 rounded-lg bg-zinc-800/80" />
      </div>
    </div>
  )
}

function HistoryItem({
  item,
  onRunAgain,
}: {
  item: SearchHistoryItemDto
  onRunAgain: (item: SearchHistoryItemDto) => void
}) {
  const modeLabel = item.mode?.toUpperCase() ?? 'UNKNOWN MODE'
  const resultLabel =
    item.result_count === null
      ? 'No result count'
      : `${item.result_count.toLocaleString('en-US')} results`
  const displayQuestion = formatQuestionForList(item.question)

  const applyRecentQuery = () => onRunAgain(item)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      applyRecentQuery()
    }
  }
  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    applyRecentQuery()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={applyRecentQuery}
      onKeyDown={handleKeyDown}
      className="group w-full cursor-pointer rounded-lg border border-slate-500/24 bg-[#17263b]/68 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 hover:border-slate-300/45 hover:bg-[#223451]/78 hover:shadow-[0_0_24px_-20px_#93c5fd] focus-visible:ring-2 focus-visible:ring-cyan-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101b2b] focus-visible:outline-none active:scale-[0.99]"
      aria-label={`Use recent query: ${displayQuestion}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-slate-100 transition-colors group-hover:text-white">
            {displayQuestion}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'h-5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-[0_0_12px_-9px_currentColor]',
                  modeBadgeClass(item.mode),
                )}
              >
                {modeLabel}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'h-5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide shadow-[0_0_12px_-9px_currentColor]',
                  statusBadgeClass(item.status),
                )}
              >
                {item.status}
              </Badge>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-mono">
                <Clock3 className="size-3" />
                {formatCreatedAt(item.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                {item.mode === 'aggregation' ? (
                  <BarChart3 className="size-3" />
                ) : (
                  <Database className="size-3" />
                )}
                {resultLabel}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          title="Use this query"
          aria-label={`Use this query: ${displayQuestion}`}
          onClick={handleActionClick}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-400 opacity-85 transition-all duration-200 hover:border-cyan-300/35 hover:bg-cyan-400/10 hover:text-cyan-100 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:outline-none group-hover:text-cyan-100 group-hover:opacity-100"
        >
          <Play className="ml-0.5 size-4" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}

export function HistorySheet({
  open,
  status,
  response,
  error,
  onOpenChange,
  onViewAll,
  onRunAgain,
  onRetry,
}: {
  open: boolean
  status: HistoryStatus
  response: SearchHistoryPageDto | null
  error: UiError | null
  onOpenChange: (open: boolean) => void
  onViewAll?: () => void
  onRunAgain: (item: SearchHistoryItemDto) => void
  onRetry: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/68 px-4 py-6 backdrop-blur-[6px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false)
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-queries-title"
        className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-400/18 bg-[#142238]/95 shadow-[0_22px_80px_-46px_rgba(0,0,0,0.95),0_0_34px_-28px_#93c5fd]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.09),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(148,163,184,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.7)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative flex items-center justify-between border-b border-slate-500/18 px-5 py-4">
          <h2
            id="recent-queries-title"
            className="flex items-center gap-3 text-lg font-semibold text-slate-100"
          >
            <span className="grid size-8 place-items-center rounded-lg text-slate-400">
              <History className="size-5" />
            </span>
            Recent Queries
          </h2>
          <button
            type="button"
            aria-label="Close recent queries"
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-400/20 hover:bg-slate-300/10 hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
          {status === 'loading' ? (
            <>
              <span className="flex items-center gap-2 text-xs text-zinc-500">
                <LoaderCircle className="size-4 animate-spin" />
                Loading recent investigations...
              </span>
              {[0, 1, 2, 3, 4].map((item) => (
                <HistorySkeletonCard key={item} />
              ))}
            </>
          ) : null}

          {status === 'error' && error ? (
            <Alert className="border-rose-500/25 bg-rose-500/10">
              <TriangleAlert className="mb-2 size-5 text-rose-300" />
              <AlertTitle>History could not be loaded</AlertTitle>
              <AlertDescription className="text-zinc-400">
                <span className="block font-medium text-zinc-300">
                  {error.message}
                </span>
                {error.errors.join(' ') || 'History could not be loaded.'}
              </AlertDescription>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onRetry}
              >
                <RotateCw />
                Retry
              </Button>
            </Alert>
          ) : null}

          {status === 'empty' ? (
            <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
              <div>
                <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-zinc-800/70 text-zinc-500 ring-1 ring-zinc-700">
                  <SearchX className="size-6" />
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">
                  No investigations yet
                </h3>
                <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">
                  Run a natural-language search and completed investigations
                  will appear here.
                </p>
              </div>
            </div>
          ) : null}

          {status === 'success'
            ? response?.items.map((item) => (
                <HistoryItem
                  key={item.query_id}
                  item={item}
                  onRunAgain={onRunAgain}
                />
              ))
            : null}
        </div>

        {response && response.items.length > 0 && onViewAll ? (
          <div className="relative flex items-center justify-center border-t border-slate-500/18 bg-slate-950/18 px-4 py-4 backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-lg border border-slate-400/24 bg-slate-900/35 px-4 text-xs text-slate-200 transition-all duration-200 hover:border-slate-300/45 hover:bg-slate-700/40 hover:text-white"
              onClick={onViewAll}
            >
              View all investigations
              <ExternalLink className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
