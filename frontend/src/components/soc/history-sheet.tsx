import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  LoaderCircle,
  Play,
  RotateCw,
  SearchX,
  TriangleAlert,
} from 'lucide-react'

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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  HistoryStatus,
  SearchHistoryItemDto,
  SearchHistoryPageDto,
  UiError,
} from '@/types/soc'

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function HistoryItem({
  item,
  onRunAgain,
}: {
  item: SearchHistoryItemDto
  onRunAgain: (item: SearchHistoryItemDto) => void
}) {
  const success = item.status === 'SUCCESS'

  return (
    <button
      type="button"
      onClick={() => onRunAgain(item)}
      className="group w-full rounded-xl border border-border bg-background/30 p-4 text-left transition-colors hover:border-cyan-400/30 hover:bg-secondary/45 focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:outline-none"
      aria-label={`Run query again: ${item.question}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={
            success
              ? 'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300'
              : 'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300'
          }
        >
          {success ? <History /> : <TriangleAlert />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-sm font-medium leading-5 text-foreground">
            {item.question}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {item.mode?.toUpperCase() ?? 'UNKNOWN MODE'}
            </Badge>
            <Badge
              variant="outline"
              className={
                success
                  ? 'border-emerald-400/25 text-emerald-300'
                  : 'border-rose-400/25 text-rose-300'
              }
            >
              {item.status}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {item.result_count === null
                ? 'No result count'
                : `${item.result_count.toLocaleString('en-US')} results`}
            </span>
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" />
              {formatCreatedAt(item.created_at)}
            </span>
            <span className="font-mono">
              {item.latency_ms === null ? 'latency n/a' : `${item.latency_ms}ms`}
            </span>
          </span>
        </span>
        <Play className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-cyan-300" />
      </div>
    </button>
  )
}

export function HistorySheet({
  open,
  status,
  response,
  error,
  onOpenChange,
  onPageChange,
  onRunAgain,
  onRetry,
}: {
  open: boolean
  status: HistoryStatus
  response: SearchHistoryPageDto | null
  error: UiError | null
  onOpenChange: (open: boolean) => void
  onPageChange: (page: number) => void
  onRunAgain: (item: SearchHistoryItemDto) => void
  onRetry: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4 text-cyan-300" />
            Recent Investigations
          </SheetTitle>
          <SheetDescription>
            Query history for the current demo analyst. Select an item to run
            it again.
          </SheetDescription>
        </SheetHeader>

        <div
          className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
          aria-live="polite"
        >
          {status === 'loading' ? (
            <>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading recent investigations...
              </span>
              {[0, 1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-28 rounded-xl" />
              ))}
            </>
          ) : null}

          {status === 'error' && error ? (
            <Alert className="border-rose-400/30 bg-rose-500/5">
              <TriangleAlert className="mb-2 size-5 text-rose-300" />
              <AlertTitle>{error.message}</AlertTitle>
              <AlertDescription>
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
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border text-center">
              <div>
                <SearchX className="mx-auto mb-3 size-8 text-muted-foreground" />
                <h3 className="text-sm font-semibold">No query history yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Completed searches will appear here.
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

        {response && response.total_pages > 0 ? (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
            <span className="text-xs text-muted-foreground">
              Page {response.page + 1} of {response.total_pages}
              <span className="hidden sm:inline">
                {' '}
                · {response.total.toLocaleString('en-US')} queries
              </span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous history page"
                disabled={response.page <= 0 || status === 'loading'}
                onClick={() => onPageChange(response.page - 1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next history page"
                disabled={
                  response.page + 1 >= response.total_pages ||
                  status === 'loading'
                }
                onClick={() => onPageChange(response.page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
