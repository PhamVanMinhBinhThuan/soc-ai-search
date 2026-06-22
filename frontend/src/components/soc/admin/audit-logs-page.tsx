import { useEffect, useState } from "react"
import { ShieldAlert, ArrowLeft, ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAuditLogs } from "@/services/history-api"
import { getSearchHistoryDetail } from "@/services/history-api"
import type { AuditLogItem, SearchHistoryDetailDto } from "@/types/soc"
import { ModeBadge, StatusBadge } from "../investigations/investigation-badges"
import { InvestigationDetailPanel } from "../investigations/investigation-detail-panel"

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailLoading(true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailError(null)

    getSearchHistoryDetail(selectedId, abortController.signal)
      .then(res => {
        setSelectedItemDetail(res)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch history detail", err)
          setDetailError("Không thể tải chi tiết. Backend có thể đang chặn quyền truy cập.")
        }
      })
      .finally(() => {
        setDetailLoading(false)
      })

    return () => abortController.abort()
  }, [selectedId])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-zinc-950 text-zinc-50">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4">
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
      </header>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Master List */}
        <div
          className={cn(
            "flex h-full min-h-0 flex-col border-r border-zinc-800 transition-all duration-300",
            selectedId ? "w-1/2" : "w-full"
          )}
        >
          {/* Table Container */}
          <div className="min-h-0 flex-1 overflow-auto">
            {loading && items.length === 0 ? (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <Search className="mr-2 size-4 animate-spin" />
                Loading audit logs...
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                <ShieldAlert className="mb-4 size-10 opacity-20" />
                <p>No audit logs found.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action / Question</th>
                    <th className="px-4 py-3 font-medium text-right">Results / Latency</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {items.map((item) => {
                    const isActive = item.id === selectedId
                    const date = new Date(item.created_at)
                    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedId(isActive ? null : item.id)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-zinc-800/50",
                          isActive && "bg-cyan-950/20"
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400">
                          <span className="block text-zinc-500">{dateStr}</span>
                          <span>{timeStr}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-300">
                          {item.user_identity}
                        </td>
                        <td className="px-4 py-3">
                          <span className="line-clamp-2 text-sm font-medium text-zinc-200">
                            {item.question}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-zinc-400">
                          <span className="block">{item.result_count?.toLocaleString() ?? '-'} items</span>
                          <span className="text-zinc-500">{item.latency_ms ?? '-'}ms</span>
                        </td>
                        <td className="px-4 py-3">
                          <ModeBadge mode={item.mode} />
                        </td>
                        <td className="px-4 py-3">
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
          <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
            <div>
              Page {page + 1} of {Math.max(1, totalPages)}
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
        {selectedId && (
          <div className="flex w-1/2 min-w-0 flex-col bg-zinc-900/30">
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
  )
}
