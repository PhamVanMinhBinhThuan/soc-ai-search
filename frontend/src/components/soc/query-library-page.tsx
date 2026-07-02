import { useMemo, useState } from 'react'
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

const ITEMS_PER_PAGE = 2

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
    item.badges.some((badge) => badge.toLowerCase().includes(q)) ||
    item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    item.categories.some((category) => category.toLowerCase().includes(q)) ||
    EXPECTED_VIEW_LABELS[item.expectedView].toLowerCase().includes(q)
  )
}

function CopyButton({ question }: { question: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(question)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      aria-label="Copy query"
      title="Copy query"
      onClick={handleCopy}
      className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/70 text-zinc-400 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-100"
    >
      {copied ? (
        <Check className="size-4 text-emerald-400" />
      ) : (
        <Copy className="size-4" />
      )}
    </button>
  )
}

function QueryBadge({ badge }: { badge: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${BADGE_CLASS_MAP[badge] ?? 'border-zinc-800 bg-zinc-900/60 text-zinc-400'}`}
    >
      {badge}
    </span>
  )
}

function CategoryButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? 'rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee]'
          : 'rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-cyan-500/30 hover:text-zinc-100'
      }
    >
      {label}
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
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 transition-colors hover:border-cyan-500/35 hover:bg-cyan-950/10">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 text-sm font-semibold leading-5 text-zinc-100">
          {item.question}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <CopyButton question={item.question} />
          <button
            type="button"
            aria-label="Use this query"
            title="Use this query"
            onClick={() => onUseQuery(item.question)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-cyan-500/35 bg-cyan-500/10 text-cyan-100 transition-colors hover:bg-cyan-400/20"
          >
            <CornerDownLeft className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {item.badges.map((badge) => (
          <QueryBadge key={badge} badge={badge} />
        ))}
      </div>

      <p className="mt-1.5 text-[11px] text-zinc-500">
        Expected: {EXPECTED_VIEW_LABELS[item.expectedView]}
      </p>
    </article>
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
  const rangeStart = filtered.length === 0 ? 0 : safePage * ITEMS_PER_PAGE + 1
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
    <main className="flex h-full min-h-0 flex-1 flex-col bg-zinc-950 text-zinc-200">
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
          <Library className="size-5 text-cyan-300" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Query Library
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 p-4 sm:p-5">
          <section className="flex flex-col gap-3" aria-label="Query filters">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search queries, tags, event types, users, hosts..."
                aria-label="Search query library"
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-10 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CategoryButton
                label="All"
                active={activeCategory === 'all'}
                onClick={() => handleCategoryChange('all')}
              />
              {ALL_CATEGORIES.map((category) => (
                <CategoryButton
                  key={category}
                  label={CATEGORY_LABELS[category]}
                  active={activeCategory === category}
                  onClick={() => handleCategoryChange(category)}
                />
              ))}
            </div>
          </section>

          {pageItems.length > 0 ? (
            <section className="flex flex-col gap-3" aria-label="Query list">
              {pageItems.map((item) => (
                <QueryCard
                  key={item.id}
                  item={item}
                  onUseQuery={onUseQuery}
                />
              ))}
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 py-14 text-center">
              <SearchX className="size-10 text-zinc-600" />
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  No matching queries
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Try another keyword or clear filters.
                </p>
              </div>
            </div>
          )}

          {filtered.length > ITEMS_PER_PAGE ? (
            <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-zinc-800 bg-zinc-950/95 px-1 py-3 backdrop-blur">
              <span className="text-xs text-zinc-500">
                Showing {rangeStart}-{rangeEnd} of {filtered.length}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="mr-2 text-xs text-zinc-500">
                  Page {safePage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage(safePage - 1)}
                  aria-label="Previous page"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(safePage + 1)}
                  aria-label="Next page"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
