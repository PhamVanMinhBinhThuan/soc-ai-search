import { useEffect, useState, useMemo } from "react"
import { ShieldAlert, ArrowLeft, ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAuditLogs, getSearchHistoryDetail } from "@/services/history-api"
import type { AuditLogItem, SearchHistoryDetailDto } from "@/types/soc"
import { ModeBadge, StatusBadge } from "../investigations/investigation-badges"
import { InvestigationDetailPanel } from "../investigations/investigation-detail-panel"

const FILTERS = ["All", "Success", "Failed", "Search", "Aggregation"]

export function AuditLogsPage({
  onBack,
}: {
  onBack?: () => void
}) {
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedItemDetail, setSelectedItemDetail] = useState<SearchHistoryDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const fetchLogs = (targetPage: number) => {
    const abortController = new AbortController()
    setLoading(true)
    
    getAuditLogs(targetPage, 50, abortController.signal)
      .then(res => {
        setItems(res.items)
        setTotalPages(res.total_pages)
        setTotal(res.total)
        setPage(res.page)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch audit logs", err)
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => abortController.abort()
  }

  // Fetch initial history
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    return fetchLogs(0)
  }, [])

  // Fetch details when an item is selected
  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedItemDetail(null)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetailError(null)
      return
    }

    const abortController = new AbortController()
    setDetailLoading(true)
    setDetailError(null)

    getSearchHistoryDetail(selectedId, abortController.signal)
      .then(res => setSelectedItemDetail(res))
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch history detail", err)
          setDetailError("Không thể tải chi tiết. Backend có thể đang chặn quyền truy cập.")
        }
      })
      .finally(() => setDetailLoading(false))

    return () => abortController.abort()
  }, [selectedId])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Search Query Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !item.question.toLowerCase().includes(query) &&
          !item.user_identity.toLowerCase().includes(query)
        ) {
          return false
        }
      }
      // 2. Pill Filter
      if (activeFilter === 'Success') return item.status === 'SUCCESS'
      if (activeFilter === 'Failed') return item.status === 'FAILED'
      if (activeFilter === 'Search') return item.mode.toLowerCase() === 'search'
      if (activeFilter === 'Aggregation') return item.mode.toLowerCase() === 'aggregation'
      return true
    })
  }, [items, searchQuery, activeFilter])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-zinc-950 text-zinc-50">
      {/* Header */}
      <header className="flex shrink-0 flex-col border-b border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <ShieldCheck className="size-5 text-amber-400" />
          <div>
            <h1 className="text-sm font-semibold text-zinc-100">System Audit Logs</h1>
            <p className="text-xs text-zinc-500">
              {loading ? "Loading..." : `${total.toLocaleString()} total queries`}
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900/50 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeFilter === f
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              💡 Tip: Click on any row to view full details
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        {/* Master List */}
        <div
          className={cn(
            "flex h-full min-h-0 flex-col border-r border-zinc-800 transition-all duration-300 ease-in-out shrink-0",
            selectedId ? "w-0 hidden md:flex md:w-[35%] bg-zinc-950/50" : "w-full"
          )}
        >
          {/* Table / Cards Container */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <Search className="mr-2 size-4 animate-spin" />
                Loading audit logs...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                <ShieldAlert className="mb-4 size-10 opacity-20" />
                <p>No audit logs match your filters.</p>
              </div>
            ) : selectedId ? (
              // Cards View (when details open)
              <div className="flex flex-col gap-2 p-2">
                {filteredItems.map(item => {
                  const isActive = item.query_id === selectedId
                  const date = new Date(item.created_at)
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={item.query_id}
                      onClick={() => setSelectedId(isActive ? null : item.query_id)}
                      className={cn(
                        "group w-full cursor-pointer rounded-lg border p-3 text-left transition-all",
                        isActive
                          ? "border-cyan-500/50 bg-cyan-500/[0.06] shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_0_18px_-6px_rgba(34,211,238,0.5)]"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between font-mono text-xs text-zinc-500">
                        <span>{timeStr}</span>
                        <span className="font-sans text-zinc-400">{item.user_identity}</span>
                      </div>
                      <p
                        className={cn(
                          "mb-2 line-clamp-2 text-sm font-medium leading-snug text-pretty",
                          isActive ? "text-zinc-100" : "text-zinc-300"
                        )}
                      >
                        {item.question}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ModeBadge mode={item.mode} />
                        <StatusBadge status={item.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              // Table View (full width)
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4">TIMESTAMP</th>
                    <th className="px-6 py-4">USER</th>
                    <th className="px-6 py-4">QUESTION</th>
                    <th className="px-6 py-4 text-right">LATENCY</th>
                    <th className="px-6 py-4 text-right">RESULTS</th>
                    <th className="px-6 py-4">MODE</th>
                    <th className="px-6 py-4">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredItems.map((item) => {
                    const isActive = item.query_id === selectedId
                    const date = new Date(item.created_at)
                    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

                    return (
                      <tr
                        key={item.query_id}
                        onClick={() => setSelectedId(isActive ? null : item.query_id)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-zinc-800/80",
                          isActive && "bg-cyan-950/20"
                        )}
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-400">
                          <span className="block text-zinc-500">{dateStr}</span>
                          <span>{timeStr}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          {item.user_identity}
                        </td>
                        <td className="px-6 py-4">
                          <span className="line-clamp-2 text-sm font-medium text-zinc-200">
                            {item.question}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-xs text-zinc-500">
                          {item.latency_ms ?? '-'}ms
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-xs text-zinc-400">
                          {item.result_count?.toLocaleString() ?? '-'}
                        </td>
                        <td className="px-6 py-4">
                          <ModeBadge mode={item.mode} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <div>
              Page {page + 1} of {Math.max(1, totalPages)} &middot; {total.toLocaleString()} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
                disabled={page === 0 || loading}
                onClick={() => fetchLogs(page - 1)}
              >
                <ChevronLeft className="mr-1 size-3.5" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => fetchLogs(page + 1)}
              >
                Next
                <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-all duration-300 ease-in-out shrink-0 bg-zinc-900/30",
            selectedId ? "w-full opacity-100 md:w-[65%]" : "w-0 opacity-0"
          )}
        >
          {selectedId && (
            <div className="flex h-full flex-col">
              {detailLoading ? (
                <div className="flex h-full items-center justify-center text-zinc-500">
                  <Search className="mr-2 size-4 animate-spin" />
                  Loading detail...
                </div>
              ) : detailError ? (
                <div className="flex h-full flex-col items-center justify-center text-rose-400 p-6 text-center">
                  <ShieldAlert className="mb-4 size-10 opacity-50" />
                  <p>{detailError}</p>
                </div>
              ) : selectedItemDetail ? (
                <InvestigationDetailPanel
                  item={selectedItemDetail}
                  onClose={() => setSelectedId(null)}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
