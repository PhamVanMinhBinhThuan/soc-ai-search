import { ChevronLeft, ChevronRight, Lightbulb, Search, Star } from "lucide-react"
import { parseQuestionForList, type AuditQuestionListParts } from "@/lib/audit-question-format"
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
  const searchEl = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
      <input
        value={questionQuery}
        onChange={(event) => onQuestionQueryChange(event.target.value)}
        placeholder="Search questions..."
        className="h-10 w-full rounded-xl border border-cyan-400/20 bg-cyan-950/10 py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-slate-500 outline-none shadow-[0_0_22px_-18px_rgba(34,211,238,0.9)] transition hover:border-cyan-400/35 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/15"
      />
    </div>
  )

  const modeEl = (
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
  )

  const statusEl = (
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
  )

  const pinnedEl = (
    <button
      type="button"
      onClick={() => onPinnedOnlyChange(!pinnedOnly)}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition whitespace-nowrap shrink-0",
        pinnedOnly
          ? "border-amber-400/45 bg-amber-400/12 text-amber-100 shadow-[0_0_18px_-12px_rgba(251,191,36,0.9)]"
          : "border-cyan-400/15 bg-zinc-900/50 text-zinc-400 hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-cyan-100",
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
  )

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-cyan-400/15 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.08),transparent_28%),#080A0F]">
      <div className="flex flex-col gap-3 border-b border-cyan-400/15 bg-[#0B0E13]/80 p-3 backdrop-blur">
        {/* Layout cho màn hình Full (chưa click) */}
        <div className={cn("gap-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_auto]", expanded ? "grid" : "hidden")}>
          {searchEl}
          {modeEl}
          {statusEl}
          {pinnedEl}
        </div>

        {/* Layout cho màn hình thu nhỏ (khi đã click xem chi tiết) */}
        <div className={cn("flex-col gap-2", !expanded ? "flex" : "hidden")}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              {searchEl}
            </div>
            {pinnedEl}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {modeEl}
            {statusEl}
          </div>
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
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <Search className="mb-3 size-9 text-zinc-700" />
            <p className="text-sm font-semibold text-zinc-200">No investigations found</p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Try clearing filters or changing the search text.
            </p>
          </div>
        ) : expanded ? (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[linear-gradient(90deg,rgba(34,211,238,0.11),rgba(168,85,247,0.05)),#0B0E13]/95 backdrop-blur">
              <tr className="border-b border-cyan-400/18">
                <th className="w-10 px-3 py-2.5">
                  <span className="sr-only">Pinned</span>
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/65">
                  Timestamp
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/65">
                  Question
                </th>
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/65">
                  Results
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/65">
                  Mode
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100/65">
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
                    className={cn(
                      "group cursor-pointer border-b border-l-2 border-b-cyan-400/10 border-l-transparent bg-[linear-gradient(90deg,rgba(34,211,238,0.018),rgba(8,10,15,0.1))] transition hover:bg-cyan-400/[0.075] hover:shadow-[0_0_22px_-16px_rgba(34,211,238,0.9)]",
                      item.query_id === activeId && "border-l-cyan-300 bg-cyan-400/[0.11] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.24),0_0_26px_-16px_rgba(34,211,238,0.95)]",
                    )}
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
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "flex min-h-9 items-center rounded-xl border px-3 py-2 text-sm font-semibold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition",
                        item.query_id === activeId
                          ? "border-cyan-300/35 bg-cyan-400/[0.08] shadow-[0_0_18px_-12px_rgba(34,211,238,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "border-cyan-400/12 bg-[#111827]/45 group-hover:border-cyan-400/28 group-hover:bg-cyan-400/[0.055]",
                      )}>
                        <QuestionSummary question={item.question} compact />
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
                        ? "border-cyan-400/55 bg-cyan-400/[0.10] shadow-[0_0_26px_-12px_rgba(34,211,238,0.95),inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "border-cyan-400/16 bg-[linear-gradient(180deg,rgba(34,211,238,0.055),rgba(17,24,39,0.45))] hover:border-cyan-400/35 hover:bg-cyan-400/[0.07]",
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
                        "mb-2 line-clamp-2 text-sm font-semibold leading-snug text-pretty",
                        isActive ? "text-zinc-100" : "text-zinc-300",
                      )}
                    >
                      <QuestionSummary question={item.question} />
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

      {total > 0 && totalPages > 1 && (
          <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between border-t border-cyan-400/18 bg-[#080A0F]/95 px-4 py-2.5 backdrop-blur">
            <span className="text-xs text-zinc-500">
              Page {page + 1} of {totalPages} &middot; {total.toLocaleString()} total
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Previous page"
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex size-7 items-center justify-center rounded-md border border-cyan-400/15 bg-zinc-900 text-zinc-400 transition hover:border-cyan-400/45 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                aria-label="Next page"
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex size-7 items-center justify-center rounded-md border border-cyan-400/15 bg-zinc-900 text-zinc-400 transition hover:border-cyan-400/45 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
      )}
      {total > 0 && totalPages <= 1 && (
          <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between border-t border-cyan-400/18 bg-[#080A0F]/95 px-4 py-2.5 text-xs text-zinc-500 backdrop-blur">
            Page 1 of 1 &middot; {total.toLocaleString()} total
          </div>
      )}
    </div>
  )
}

function QuestionSummary({
  question,
  compact = false,
}: {
  question: string
  compact?: boolean
}) {
  const parts = parseQuestionForList(question)

  if (!parts.prefix) {
    return <>{parts.question}</>
  }

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <QuestionPrefixBadge parts={parts} />
      <span className={cn("min-w-0", compact ? "truncate" : "line-clamp-2")}>
        {parts.question}
      </span>
      {parts.feedback ? (
        <span className="min-w-0 text-zinc-500">
          <span className="text-zinc-600">Feedback:</span> {parts.feedback}
        </span>
      ) : null}
    </span>
  )
}

function QuestionPrefixBadge({ parts }: { parts: AuditQuestionListParts }) {
  const styles: Record<NonNullable<AuditQuestionListParts["prefix"]>, string> = {
    "Edited SearchPlan": "border-amber-400/40 bg-amber-400/12 text-amber-100 shadow-[0_0_16px_-10px_rgba(251,191,36,0.9)]",
    "Filtered Result": "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_16px_-10px_rgba(34,211,238,0.9)]",
    "AI Corrected": "border-purple-400/40 bg-purple-400/12 text-purple-100 shadow-[0_0_16px_-10px_rgba(168,85,247,0.9)]",
  }

  if (!parts.prefix) {
    return null
  }

  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", styles[parts.prefix])}>
      {parts.prefix}
    </span>
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
        className="h-10 w-full appearance-none rounded-xl border border-cyan-400/20 bg-cyan-950/10 px-3 pr-8 text-sm font-medium text-zinc-100 outline-none shadow-[0_0_22px_-18px_rgba(34,211,238,0.9)] transition hover:border-cyan-400/35 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/15"
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
