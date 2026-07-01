import { useState, useMemo } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CornerDownLeft,
  Library,
  Search,
  SearchX,
} from 'lucide-react'

import {
  BADGE_CLASS_MAP,
  CATEGORY_LABELS,
  EXPECTED_VIEW_LABELS,
  QUERY_LIBRARY_ITEMS,
  type QueryLibraryCategory,
  type QueryLibraryItem,
} from '@/lib/query-library'

const ITEMS_PER_PAGE = 10

const ALL_CATEGORIES: QueryLibraryCategory[] = [
  'search',
  'aggregation',
  'top_n',
  'count',
  'time_series',
  'line_chart',
  'bar_chart',
  'multi_filter',
  'playbook',
]

function matchesSearch(item: QueryLibraryItem, query: string): boolean {
  const q = query.toLowerCase()
  return (
    item.question.toLowerCase().includes(q) ||
    item.badges.some((b) => b.toLowerCase().includes(q)) ||
    item.tags.some((t) => t.toLowerCase().includes(q)) ||
    item.categories.some((c) => c.toLowerCase().includes(q)) ||
    EXPECTED_VIEW_LABELS[item.expectedView].toLowerCase().includes(q)
  )
}

function CopyButton({ question }: { question: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(question)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      aria-label="Copy query"
      title="Copy query"
      onClick={handleCopy}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/45 text-muted-foreground transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100"
    >
      {copied ? (
        <Check className="size-4 text-emerald-400" />
      ) : (
        <Copy className="size-4" />
      )}
    </button>
  )
}

function QueryCard({
  item,
  onUseQuery,
}: {
  item: QueryLibraryItem
  onUseQuery: (question: string) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-zinc-950/45 p-4 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-6 text-foreground sm:text-base">
          {item.question}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <CopyButton question={item.question} />
          <button
            type="button"
            aria-label="Use this query"
            title="Use this query"
            onClick={() => onUseQuery(item.question)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 transition-colors hover:bg-cyan-400/20"
          >
            <CornerDownLeft className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.badges.map((badge) => (
          <span
            key={badge}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${BADGE_CLASS_MAP[badge] ?? 'border-border bg-secondary/45 text-muted-foreground'}`}
          >
            {badge}
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Expected: {EXPECTED_VIEW_LABELS[item.expectedView]}
      </p>
    </div>
  )
}

export function QueryLibraryPage({
  onUseQuery,
}: {
  onUseQuery: (question: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<
    QueryLibraryCategory | 'all'
  >('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let items = QUERY_LIBRARY_ITEMS

    if (activeCategory !== 'all') {
      items = items.filter((item) => item.categories.includes(activeCategory))
    }

    if (searchQuery.trim()) {
      items = items.filter((item) => matchesSearch(item, searchQuery.trim()))
    }

    return items
  }, [activeCategory, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE,
  )
  const rangeStart = safePage * ITEMS_PER_PAGE + 1
  const rangeEnd = Math.min((safePage + 1) * ITEMS_PER_PAGE, filtered.length)

  const handleCategoryChange = (cat: QueryLibraryCategory | 'all') => {
    setActiveCategory(cat)
    setPage(0)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(0)
  }

  return (
    <div className="flex-1 min-w-0 bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 sm:p-6">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25">
                <Library className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Query Library
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reusable SOC investigation questions based on the synthetic
                  dataset.
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-secondary/45 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {filtered.length} queries
            </span>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search queries, tags, event types, users, hosts..."
              aria-label="Search query library"
              className="h-11 w-full rounded-xl border border-border bg-zinc-950/50 px-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-cyan-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={activeCategory === 'all'}
              onClick={() => handleCategoryChange('all')}
              className={
                activeCategory === 'all'
                  ? 'rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee]'
                  : 'rounded-full border border-border bg-secondary/45 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-400/30 hover:text-foreground'
              }
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={activeCategory === cat}
                onClick={() => handleCategoryChange(cat)}
                className={
                  activeCategory === cat
                    ? 'rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee]'
                    : 'rounded-full border border-border bg-secondary/45 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-400/30 hover:text-foreground'
                }
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {pageItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {pageItems.map((item) => (
              <QueryCard
                key={item.id}
                item={item}
                onUseQuery={onUseQuery}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
            <SearchX className="size-10 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                No matching queries
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try another keyword or clear filters.
              </p>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/45 text-muted-foreground transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
                {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-secondary/45 text-muted-foreground transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
