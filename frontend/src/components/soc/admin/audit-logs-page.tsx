import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Search, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { downloadCsvBlob } from "@/services/csv-export-api"
import { exportAuditLogs, getAuditLogs, getSearchHistoryDetail } from "@/services/history-api"
import type { AuditLogItem, SearchHistoryDetailDto } from "@/types/soc"
import { ModeBadge, StatusBadge } from "../investigations/investigation-badges"
import { InvestigationDetailPanel } from "../investigations/investigation-detail-panel"

const FILTERS = ["All", "Success", "Failed", "Search", "Aggregation"] as const
const PAGE_SIZE = 5

export function AuditLogsPage({ onBack }: { onBack?: () => void }) {
  const [items, setItems] = useState<AuditLogItem[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedItemDetail, setSelectedItemDetail] = useState<SearchHistoryDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All")

  const fetchLogs = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      try {
        const res = await getAuditLogs(
          targetPage,
          PAGE_SIZE,
          filtersForRequest(activeFilter, searchQuery),
          signal,
        )
        setItems(res.items)
        setTotalPages(res.total_pages)
        setTotal(res.total)
        setPage(res.page)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Failed to fetch audit logs", err)
        }
      } finally {
        setLoading(false)
      }
    },
    [activeFilter, searchQuery],
  )

  useEffect(() => {
    const abortController = new AbortController()
    const timer = window.setTimeout(() => {
      void fetchLogs(page, abortController.signal)
    }, searchQuery.trim() ? 250 : 0)

    return () => {
      window.clearTimeout(timer)
      abortController.abort()
    }
  }, [fetchLogs, page, searchQuery])

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedItemDetail(null)
      setDetailError(null)
      return
    }

    const abortController = new AbortController()
    setDetailLoading(true)
    setDetailError(null)

    getSearchHistoryDetail(selectedId, abortController.signal)
      .then(res => setSelectedItemDetail(res))
      .catch(err => {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Failed to fetch history detail", err)
          setDetailError("Không thể tải chi tiết. Backend có thể đang chặn quyền truy cập.")
        }
      })
      .finally(() => setDetailLoading(false))

    return () => abortController.abort()
  }, [selectedId])

  async function handleExportAudit() {
    setExporting(true)
    try {
      const result = await exportAuditLogs(filtersForRequest(activeFilter, searchQuery))
      downloadCsvBlob(result.blob, result.filename)
    } catch (err) {
      console.error("Failed to export audit logs", err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-zinc-950 text-zinc-50">
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
          <Button
            variant="outline"
            size="sm"
            disabled={exporting}
            onClick={handleExportAudit}
            className="ml-auto border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-200"
          >
            <Download className="mr-2 size-4" />
            {exporting ? "Exporting..." : "Export Audit CSV"}
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchQuery}
              onChange={(e) => {
                setPage(0)
                setSearchQuery(e.target.value)
              }}
              className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900/50 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => {
                    setPage(0)
                    setActiveFilter(f)
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeFilter === f
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <p className="hidden text-xs text-zinc-500 md:block">
              Tip: Click on any row to view full details
            </p>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "flex h-full min-h-0 shrink-0 flex-col border-r border-zinc-800 transition-all duration-300 ease-in-out",
            selectedId ? "hidden w-0 bg-zinc-950/50 md:flex md:w-[35%]" : "w-full",
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <Search className="mr-2 size-4 animate-spin" />
                Loading audit logs...
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                <ShieldAlert className="mb-4 size-10 opacity-20" />
                <p>No audit logs match your filters.</p>
              </div>
            ) : selectedId ? (
              <div className="flex flex-col gap-2 p-2">
                {items.map(item => {
                  const isActive = item.query_id === selectedId
                  const timeStr = new Date(item.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  return (
                    <button
                      key={item.query_id}
                      onClick={() => setSelectedId(isActive ? null : item.query_id)}
                      className={cn(
                        "group w-full cursor-pointer rounded-lg border p-3 text-left transition-all",
                        isActive
                          ? "border-cyan-500/50 bg-cyan-500/[0.06] shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_0_18px_-6px_rgba(34,211,238,0.5)]"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70",
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between font-mono text-xs text-zinc-500">
                        <span>{timeStr}</span>
                        <span className="font-sans text-zinc-400">{item.user_identity}</span>
                      </div>
                      <p className={cn("mb-2 line-clamp-2 text-sm font-medium leading-snug text-pretty", isActive ? "text-zinc-100" : "text-zinc-300")}>
                        {item.question}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ModeBadge mode={item.mode} />
                        <StatusBadge status={item.status} />
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Question</th>
                    <th className="px-6 py-4 text-right">Results</th>
                    <th className="px-6 py-4">Mode</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {items.map((item) => {
                    const isActive = item.query_id === selectedId
                    const date = new Date(item.created_at)
                    const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" })
                    const timeStr = date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })

                    return (
                      <tr
                        key={item.query_id}
                        onClick={() => setSelectedId(isActive ? null : item.query_id)}
                        className={cn("cursor-pointer transition-colors hover:bg-zinc-800/80", isActive && "bg-cyan-950/20")}
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-400">
                          <span className="block text-zinc-500">{dateStr}</span>
                          <span>{timeStr}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{item.user_identity}</td>
                        <td className="px-6 py-4">
                          <span className="line-clamp-2 text-sm font-medium text-zinc-200">
                            {item.question}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-xs text-zinc-400">
                          {item.result_count?.toLocaleString() ?? "-"}
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

          <div className="flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <div>
              Page {page + 1} of {Math.max(1, totalPages)} · {total.toLocaleString()} total
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-9 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
                disabled={page === 0 || loading}
                onClick={() => setPage(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 shrink-0 overflow-hidden bg-zinc-900/30 transition-all duration-300 ease-in-out",
            selectedId ? "w-full opacity-100 md:w-[65%]" : "w-0 opacity-0",
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
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-rose-400">
                  <ShieldAlert className="mb-4 size-10 opacity-50" />
                  <p>{detailError}</p>
                </div>
              ) : selectedItemDetail ? (
                <InvestigationDetailPanel
                  item={selectedItemDetail}
                  onClose={() => setSelectedId(null)}
                  showExportAction={false}
                  showLatency={false}
                  showPinAction={false}
                  showQueryId={false}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function filtersForRequest(activeFilter: string, searchQuery: string) {
  return {
    q: searchQuery.trim() || undefined,
    status:
      activeFilter === "Success"
        ? "SUCCESS"
        : activeFilter === "Failed"
          ? "FAILED"
          : "all",
    mode:
      activeFilter === "Search"
        ? "search"
        : activeFilter === "Aggregation"
          ? "aggregation"
          : "all",
  } as const
}
