import { useEffect, useMemo, useState } from "react"
import { ShieldAlert } from "lucide-react"
import { InvestigationsMasterList, type FilterKey } from "./investigations-master-list"
import { InvestigationDetailPanel } from "./investigation-detail-panel"
import { getSearchHistory, getSearchHistoryDetail } from "@/services/history-api"
import type { SearchHistoryItemDto, SearchHistoryDetailDto } from "@/types/soc"

export function InvestigationsPage() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  const [items, setItems] = useState<SearchHistoryItemDto[]>([])
  const [selectedItemDetail, setSelectedItemDetail] = useState<SearchHistoryDetailDto | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch initial history
  useEffect(() => {
    const abortController = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    getSearchHistory(0, 50, abortController.signal)
      .then(res => {
        setItems(res.items)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch history", err)
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => abortController.abort()
  }, [])

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
        // detail is typed as unknown so we cast it for now
        setSelectedItemDetail(detail as unknown as SearchHistoryDetailDto)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch history detail", err)
        }
      })

    return () => abortController.abort()
  }, [selectedId])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesQuery = item.question
        .toLowerCase()
        .includes(query.toLowerCase().trim())
      
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "pinned"
            ? item.pinned
            : filter === "SUCCESS" || filter === "FAILED"
              ? item.status === filter
              : item.mode === filter

      return matchesQuery && matchesFilter
    })
  }, [items, query, filter])

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
          <p className="text-sm text-zinc-500">
            Audit-backed query history and playbooks
          </p>
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
            items={filtered}
            activeId={selectedId}
            onSelect={setSelectedId}
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            expanded={!selectedId}
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
            />
          )}
        </div>
      </div>
    </main>
  )
}
