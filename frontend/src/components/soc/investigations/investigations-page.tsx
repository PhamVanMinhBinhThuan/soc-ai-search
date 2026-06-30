import { useEffect, useState } from "react"
import { ShieldAlert } from "lucide-react"
import { InvestigationsMasterList, type FilterKey } from "./investigations-master-list"
import { InvestigationDetailPanel } from "./investigation-detail-panel"
import { getSearchHistory, getSearchHistoryDetail, togglePinHistory } from "@/services/history-api"
import type { SearchHistoryItemDto, SearchHistoryDetailDto } from "@/types/soc"

const PAGE_SIZE = 5

export function InvestigationsPage({
  onRunAgain,
  onExport,
  canExport,
}: {
  onRunAgain?: (item: SearchHistoryItemDto) => void
  onExport?: (queryId: string) => void
  canExport?: boolean
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  const [items, setItems] = useState<SearchHistoryItemDto[]>([])
  const [selectedItemDetail, setSelectedItemDetail] = useState<SearchHistoryDetailDto | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const abortController = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
    
      getSearchHistory(page, PAGE_SIZE, filtersForRequest(filter, query), abortController.signal)
        .then(res => {
          setItems(res.items)
          setPage(res.page)
          setTotal(res.total)
          setTotalPages(res.total_pages)
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error("Failed to fetch history", err)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    }, query.trim() ? 250 : 0)

    return () => {
      window.clearTimeout(timer)
      abortController.abort()
    }
  }, [filter, page, query])

  // Fetch details when an item is selected
  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedItemDetail(null)
      return
    }

    const abortController = new AbortController()
    getSearchHistoryDetail(selectedId, abortController.signal)
      .then(detail => {
        setSelectedItemDetail(detail)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch history detail", err)
        }
      })

    return () => abortController.abort()
  }, [selectedId])

  const handlePinToggle = async (queryId: string, pinned: boolean) => {
    try {
      const updatedItem = await togglePinHistory(queryId, pinned)
      setItems(prev => prev.map(it => it.query_id === queryId ? updatedItem : it))
      if (selectedItemDetail?.query_id === queryId) {
        setSelectedItemDetail({ ...selectedItemDetail, pinned: updatedItem.pinned, pinned_at: updatedItem.pinned_at })
      }
    } catch (err) {
      console.error('Failed to toggle pin', err)
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-200">
      {/* Page header */}
      <header className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4 shrink-0">
        <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
          <ShieldAlert className="size-5 text-cyan-300" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            Investigations
          </h1>
        </div>
      </header>

      {/* Width-shifting split-pane */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        {loading && items.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm">
            <div className="text-sm text-zinc-400">Loading investigations...</div>
          </div>
        )}

        {/* Left: Master List */}
        <div
          className={
            "min-h-0 transition-all duration-300 ease-in-out shrink-0 " +
            (selectedId
              ? "hidden w-0 md:block md:w-[35%]"
              : "w-full")
          }
        >
          <InvestigationsMasterList
            items={items}
            activeId={selectedId}
            onSelect={setSelectedId}
            query={query}
            onQueryChange={(value) => {
              setPage(0)
              setQuery(value)
            }}
            filter={filter}
            onFilterChange={(value) => {
              setPage(0)
              setFilter(value)
            }}
            page={page}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            expanded={!selectedId}
            onTogglePin={handlePinToggle}
          />
        </div>

        {/* Right: Detail Panel */}
        <div
          className={
            "min-h-0 overflow-hidden transition-all duration-300 ease-in-out shrink-0 " +
            (selectedId
              ? "w-full opacity-100 md:w-[65%]"
              : "w-0 opacity-0")
          }
        >
          {selectedItemDetail && (
            <InvestigationDetailPanel
              item={selectedItemDetail}
              onClose={() => setSelectedId(null)}
              onRunAgain={() => onRunAgain?.(selectedItemDetail)}
              onExport={() => onExport?.(selectedItemDetail.query_id)}
              canExport={canExport}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function filtersForRequest(filter: FilterKey, query: string) {
  return {
    q: query.trim() || undefined,
    pinned: filter === "pinned" ? true : undefined,
    status: filter === "SUCCESS" || filter === "FAILED" ? filter : "all",
    mode: filter === "search" || filter === "aggregation" ? filter : "all",
  } as const
}
