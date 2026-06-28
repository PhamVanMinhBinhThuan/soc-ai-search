import type { TopSourceIpItem } from "@/types/soc"

export function TopSourceIps({ data }: { data: TopSourceIpItem[] }) {
  // Use colors based on percentage thresholds for visual hierarchy
  const getBarColor = (pct: number) => {
    if (pct > 75) return "bg-rose-500"
    if (pct > 50) return "bg-amber-500"
    if (pct > 25) return "bg-cyan-400"
    return "bg-zinc-500"
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Top Source IPs</h2>
        </div>
        <span className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Live
        </span>
      </div>

      <div className="flex flex-col gap-3.5 p-5 flex-1 min-h-0 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">No data available</p>
          </div>
        ) : (
          data.map((row) => (
            <div key={row.ip}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-200">{row.ip}</span>
                <span className="text-xs font-medium tabular-nums text-zinc-400">
                  {row.events.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${getBarColor(row.percentage)}`}
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
