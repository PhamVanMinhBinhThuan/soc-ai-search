import { ChevronLeft, ChevronRight, Lightbulb, Search, Star } from "lucide-react"
import { formatQuestionForList } from "@/lib/audit-question-format"
import { cn } from "@/lib/utils"
import type { AuditStatus, SearchHistoryItemDto, SearchMode } from "@/types/soc"
import { ModeBadge, StatusBadge } from "./investigation-badges"

export function InvestigationsMasterList({
  items,
  activeId,
  onSelect,
  questionQuery,
  onQuestionQueryChange,
  pinnedOnly,
  onPinnedOnlyChange,
  modeFilter,
  onModeFilterChange,
  statusFilter,
  onStatusFilterChange,
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
  questionQuery: string
  onQuestionQueryChange: (value: string) => void
  pinnedOnly: boolean
  onPinnedOnlyChange: (value: boolean) => void
  modeFilter: SearchMode | "all"
  onModeFilterChange: (value: SearchMode | "all") => void
  statusFilter: AuditStatus | "all"
  onStatusFilterChange: (value: AuditStatus | "all") => void
  page: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
  expanded?: boolean
  onTogglePin?: (queryId: string, pinned: boolean) => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-800">
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-3">
        <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={questionQuery}
              onChange={(event) => onQuestionQueryChange(event.target.value)}
              placeholder="Search questions..."
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
          <FilterSelect
            label="Mode"
            value={modeFilter}
            onChange={(value) => onModeFilterChange(value as SearchMode | "all")}
            options={[
              { label: "All modes", value: "all" },
              { label: "SEARCH", value: "search" },
              { label: "AGGREGATION", value: "aggregation" },
            ]}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(value) => onStatusFilterChange(value as AuditStatus | "all")}
            options={[
              { label: "All statuses", value: "all" },
              { label: "SUCCESS", value: "SUCCESS" },
              { label: "FAILED", value: "FAILED" },
            ]}
          />
          <button
            type="button"
            onClick={() => onPinnedOnlyChange(!pinnedOnly)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
              pinnedOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
            )}
          >
            <Star
              className={cn(
                "size-3.5",
                pinnedOnly ? "fill-amber-400 text-amber-400" : "text-zinc-500",
              )}
            />
            Pinned only
          </button>
        </div>
        <div className="flex items-center justify-end">
          {expanded && items.length > 0 && (
            <span className="hidden text-xs text-zinc-500 sm:inline-block">
              <Lightbulb className="mr-1 inline-block size-3.5 text-amber-400" />
              Tip: Click on any row to view full details
            </span>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-500">
            No investigations match your filters.
          </p>
        ) : expanded ? (
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
              {items.map((item) => {
                const date = new Date(item.created_at)
                const dateStr = date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
                const timeStr = date.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })

                return (
                  <tr
                    key={item.query_id}
                    onClick={() => onSelect(item.query_id)}
                    className="group cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onTogglePin?.(item.query_id, !item.pinned)
                        }}
                        className="m-[-0.25rem] flex items-center justify-center rounded p-1 transition-colors hover:bg-zinc-800"
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
                        {formatQuestionForList(item.question)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-zinc-400">
                      {item.result_count?.toLocaleString() ?? "-"}
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
          <ul className="flex flex-col gap-2 p-2">
            {items.map((item) => {
              const isActive = item.query_id === activeId
              const date = new Date(item.created_at)
              const dateStr = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
              const timeStr = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })

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
                        onClick={(event) => {
                          event.stopPropagation()
                          onTogglePin?.(item.query_id, !item.pinned)
                        }}
                        className="m-[-0.25rem] flex items-center justify-center rounded p-1 transition-colors hover:bg-zinc-800/80"
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
                      {formatQuestionForList(item.question)}
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

        {totalPages > 1 && (
          <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2.5">
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
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <label className="group relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 pr-8 text-sm font-medium text-zinc-200 outline-none transition hover:border-zinc-700 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 rotate-90 text-zinc-500 transition group-focus-within:text-cyan-300"
        aria-hidden
      />
    </label>
  )
}
