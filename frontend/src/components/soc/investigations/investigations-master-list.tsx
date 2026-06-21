import { Search, Star } from "lucide-react"
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
  expanded = false,
}: {
  items: SearchHistoryItemDto[]
  activeId: string | null
  onSelect: (id: string) => void
  query: string
  onQueryChange: (value: string) => void
  filter: FilterKey
  onFilterChange: (value: FilterKey) => void
  expanded?: boolean
}) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-800">
      {/* Filters toolbar */}
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-md border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
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
                  Time
                </th>
                <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Question
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Latency
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
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const date = new Date(item.created_at)
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <tr
                    key={item.query_id}
                    onClick={() => onSelect(item.query_id)}
                    className="cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-3">
                      <Star
                        className={cn(
                          "size-3.5",
                          item.pinned
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-700",
                        )}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-500">
                      {timeStr}
                    </td>
                    <td className="px-3 py-3">
                      <span className="line-clamp-1 text-sm font-medium text-zinc-200">
                        {item.question}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-xs text-zinc-400">
                      {item.latency_ms ?? '-'}ms
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          /* Split view: compact card list */
          <ul className="flex flex-col gap-2 p-2">
            {items.map((item) => {
              const isActive = item.query_id === activeId
              const date = new Date(item.created_at)
              const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

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
                        {timeStr}
                      </span>
                      <Star
                        className={cn(
                          "size-3.5 transition",
                          item.pinned
                            ? "fill-amber-400 text-amber-400"
                            : "text-zinc-600 group-hover:text-zinc-500",
                        )}
                      />
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
    </div>
  )
}
