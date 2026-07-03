import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Download, Search, ShieldAlert, ShieldCheck, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatQuestionForList } from "@/lib/audit-question-format"
import { downloadCsvBlob } from "@/services/csv-export-api"
import { exportAuditLogs, getAuditLogs, getSearchHistoryDetail } from "@/services/history-api"
import type { AuditLogItem, AuditStatus, SearchHistoryDetailDto, SearchMode } from "@/types/soc"
import { ModeBadge, StatusBadge } from "../investigations/investigation-badges"
import { InvestigationDetailPanel } from "../investigations/investigation-detail-panel"

const PAGE_SIZE = 5

export function AuditLogsPage() {
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
  const [questionQuery, setQuestionQuery] = useState("")
  const [identityQuery, setIdentityQuery] = useState("")
  const [modeFilter, setModeFilter] = useState<SearchMode | "all">("all")
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "all">("all")

  const fetchLogs = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      setLoading(true)
      try {
        const res = await getAuditLogs(
          targetPage,
          PAGE_SIZE,
          filtersForRequest(questionQuery, identityQuery, modeFilter, statusFilter),
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
    [identityQuery, modeFilter, questionQuery, statusFilter],
  )

  useEffect(() => {
    const abortController = new AbortController()
    const timer = window.setTimeout(() => {
      void fetchLogs(page, abortController.signal)
    }, questionQuery.trim() || identityQuery.trim() ? 250 : 0)

    return () => {
      window.clearTimeout(timer)
      abortController.abort()
    }
  }, [fetchLogs, identityQuery, page, questionQuery])

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
      const result = await exportAuditLogs(
        filtersForRequest(questionQuery, identityQuery, modeFilter, statusFilter),
      )
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
          <ShieldCheck className="size-5 text-amber-400" />
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">System Audit Logs</h1>
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
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "flex h-full min-h-0 shrink-0 flex-col border-r border-zinc-800 transition-all duration-300 ease-in-out",
            selectedId ? "hidden w-0 bg-zinc-950/50 md:flex md:w-[35%]" : "w-full",
          )}
        >
          {/* SEARCH AND FILTERS */}
          <div className="flex flex-col gap-3 border-b border-zinc-800 p-3">
            <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,0.65fr)_160px_160px]">
              <SearchInput
                value={questionQuery}
                onChange={(value) => {
                  setPage(0)
                  setQuestionQuery(value)
                }}
                placeholder="Search questions..."
              />
              <SearchInput
                value={identityQuery}
                onChange={(value) => {
                  setPage(0)
                  setIdentityQuery(value)
                }}
                placeholder="Search users..."
              />
              <FilterSelect
                label="Mode"
                value={modeFilter}
                onChange={(value) => {
                  setPage(0)
                  setModeFilter(value as SearchMode | "all")
                }}
                options={[
                  { label: "All modes", value: "all" },
                  { label: "SEARCH", value: "search" },
                  { label: "AGGREGATION", value: "aggregation" },
                ]}
              />
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={(value) => {
                  setPage(0)
                  setStatusFilter(value as AuditStatus | "all")
                }}
                options={[
                  { label: "All statuses", value: "all" },
                  { label: "SUCCESS", value: "SUCCESS" },
                  { label: "FAILED", value: "FAILED" },
                ]}
              />
            </div>
            <div className="flex items-center justify-end">
              {!selectedId && items.length > 0 && (
                <span className="hidden text-xs text-zinc-500 sm:inline-block">
                  <Lightbulb className="mr-1 inline-block size-3.5 text-amber-400" />
                  Tip: Click on any row to view full details
                </span>
              )}
            </div>
          </div>
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
                        {formatQuestionForList(item.question)}
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
              <table className="w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Timestamp</th>
                    <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">User</th>
                    <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Question</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-zinc-500">Results</th>
                    <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Mode</th>
                    <th className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</th>
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
                        className={cn("group cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-900/60", isActive && "bg-cyan-950/20")}
                      >
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-zinc-500">
                          <span className="block text-zinc-400">{dateStr}</span>
                          <span>{timeStr}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-zinc-300">{item.user_identity}</td>
                        <td className="px-3 py-3">
                          <span className="line-clamp-2 text-sm font-medium text-zinc-200">
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-2.5">
              <span className="text-xs text-zinc-500">
                Page {page + 1} of {Math.max(1, totalPages)} &middot; {total.toLocaleString()} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0 || loading}
                  className="flex size-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1 || loading}
                  className="flex size-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
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

function filtersForRequest(
  questionQuery: string,
  identityQuery: string,
  modeFilter: SearchMode | "all",
  statusFilter: AuditStatus | "all",
) {
  return {
    question: questionQuery.trim() || undefined,
    identity: identityQuery.trim() || undefined,
    status: statusFilter,
    mode: modeFilter,
  } as const
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-3 text-sm text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
      />
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
