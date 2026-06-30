import { ChevronLeft, ChevronRight, Search, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SearchHistoryItemDto } from "@/types/soc"
import { ModeBadge, StatusBadge } from "./investigation-badges"

export type FilterKey = "all" | "pinned" | "SUCCESS" | "FAILED" | "search" | "aggregation"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Pinned" },
  { key: "SUCCESS", label: "Success" },
  { key: "FAILED", label: "Failed" },
  { key: "search", label: "Search" },
  { key: "aggregation", label: "Aggregation" },
]

export function InvestigationsMasterList({
  items,
  activeId,
  onSelect,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  page,
  total,
  totalPages,
  onPageChange,
  expanded = false,
  onTogglePin,
}: {
  items: SearchHistoryItemDto[]
  activeId: string | null
  onSelect: (id: string) => void
  query: string
  onQueryChange: (value: string) => void
  filter: FilterKey
  onFilterChange: (value: FilterKey) => void
  page: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  expanded?: boolean
  onTogglePin?: (queryId: string, pinned: boolean) => void
}) {
  const pagedItems = items

  const handleFilterChange = (value: FilterKey) => {
    onFilterChange(value)
  }
  const handleQueryChange = (value: string) => {
    onQueryChange(value)
  }
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-800">
      {/* Filters toolbar */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition",
                  filter === f.key
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {expanded && items.length > 0 && (
            <span className="hidden text-xs text-zinc-500 sm:inline-block">
              💡 Tip: Click on any row to view full details
            </span>
          )}
        </div>
      </div>

      {/* Scrollable region */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-500">
            No investigations match your filters.
          </p>
        ) : expanded ? (
          /* Full-width: enterprise data table */
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
              <tr className="border-b border-zinc-800">
                <th className="w-10 px-3 py-2.5">
                  <span className="sr-only">Pinned</span>
                </th>
                <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Timestamp
                </th>
                <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Question
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Results
                </th>
                <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mode
                </th>
                <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="w-8 px-3 py-2.5">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => {
                const date = new Date(item.created_at)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                
                return (
                  <tr
                    key={item.query_id}
                    onClick={() => onSelect(item.query_id)}
                    className="group cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onTogglePin?.(item.query_id, !item.pinned)
                        }}
                        className="flex items-center justify-center rounded transition-colors hover:bg-zinc-800 p-1 -m-1"
                      >
                        <Star
                          className={cn(
                            "size-3.5",
                            item.pinned
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-700",
                          )}
                        />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-500">
                      <span className="block text-zinc-400">{dateStr}</span>
                      <span>{timeStr}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="line-clamp-1 text-sm font-medium text-zinc-200">
                        {item.question}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-zinc-400">
                      {item.result_count?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-3 py-3">
                      <ModeBadge mode={item.mode} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="size-4 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          /* Split view: compact card list */
          <ul className="flex flex-col gap-2 p-2">
            {pagedItems.map((item) => {
              const isActive = item.query_id === activeId
              const date = new Date(item.created_at)
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

              return (
                <li key={item.query_id}>
                  <button
                    onClick={() => onSelect(item.query_id)}
                    className={cn(
                      "group w-full rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-cyan-500/50 bg-cyan-500/[0.06] shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_0_18px_-6px_rgba(34,211,238,0.5)]"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-500">
                        <span className="mr-1 text-zinc-400">{dateStr}</span>
                        <span>{timeStr}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onTogglePin?.(item.query_id, !item.pinned)
                        }}
                        className="flex items-center justify-center rounded transition-colors hover:bg-zinc-800/80 p-1 -m-1"
                      >
                        <Star
                          className={cn(
                            "size-3.5 transition",
                            item.pinned
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-600 group-hover:text-zinc-500",
                          )}
                        />
                      </button>
                    </div>
                    <p
                      className={cn(
                        "mb-2 line-clamp-2 text-sm font-medium leading-snug text-pretty",
                        isActive ? "text-zinc-100" : "text-zinc-300",
                      )}
                    >
                      {item.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ModeBadge mode={item.mode} />
                      <StatusBadge status={item.status} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2.5">
          <span className="text-xs text-zinc-500">
            Page {page + 1} of {totalPages} &middot; {total.toLocaleString()} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex size-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="flex size-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
