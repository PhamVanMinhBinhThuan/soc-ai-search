import {
  BarChart3,
  Clock3,
  Database,
  History,
  LoaderCircle,
  Play,
  RotateCw,
  SearchX,
  TriangleAlert,
} from 'lucide-react'
import type { KeyboardEvent, MouseEvent } from 'react'

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
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
    return 'border-blue-500/20 bg-blue-500/10 text-blue-300'
  }

  if (mode === 'aggregation') {
    return 'border-violet-500/20 bg-violet-500/10 text-violet-300'
  }

  return 'border-zinc-700 bg-zinc-800/70 text-zinc-400'
}

function statusBadgeClass(status: SearchHistoryItemDto['status']) {
  return status === 'SUCCESS'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
}

function HistorySkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-4">
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

  const runAgain = () => onRunAgain(item)
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      runAgain()
    }
  }
  const handleActionClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    runAgain()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={runAgain}
      onKeyDown={handleKeyDown}
      className="group w-full cursor-pointer rounded-xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-left transition-all hover:bg-zinc-900/70 hover:border-zinc-700 focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      aria-label={`Run query again: ${item.question}`}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-zinc-200 transition-colors group-hover:text-white">
            {item.question}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'h-5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                modeBadgeClass(item.mode),
              )}
            >
              {modeLabel}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'h-5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
                statusBadgeClass(item.status),
              )}
            >
              {item.status}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-mono">
              <Clock3 className="size-3" />
              {formatCreatedAt(item.created_at)}
            </span>
            <span className="text-zinc-700" aria-hidden="true">
              -
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

        <button
          type="button"
          title="Run this query again"
          aria-label={`Run this query again: ${item.question}`}
          onClick={handleActionClick}
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition-all duration-200 hover:bg-zinc-700/70 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:outline-none group-hover:text-cyan-300"
        >
          <Play className="size-4" />
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl overflow-hidden border-zinc-800 bg-zinc-950/95">
        <SheetHeader className="border-zinc-800 bg-zinc-950/80">
          <SheetTitle className="flex items-center gap-3 text-zinc-100">
            <span
              className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/20"
              aria-hidden="true"
            >
              <History className="size-5" />
            </span>
            <span>
              <span className="block text-xl font-semibold">Recent Queries</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <div
          className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_28rem)] p-4 sm:p-5"
          aria-live="polite"
        >
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
          <div className="flex items-center justify-center border-t border-zinc-800 bg-zinc-950/90 px-4 py-4 sm:px-5">
            <Button
              variant="outline"
              className="w-full text-zinc-300 hover:text-white"
              onClick={onViewAll}
            >
              View all investigations
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
