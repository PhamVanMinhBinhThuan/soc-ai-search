import type { TopSourceIpItem } from "@/types/soc"

export function TopSourceIps({ data }: { data: TopSourceIpItem[] }) {
  // Use colors based on rank for visual hierarchy (from intense to light)
  const getBarColor = (index: number) => {
    const colors = [
      "bg-rose-600",     // Top 1: Critical (Đỏ đậm)
      "bg-orange-500",   // Top 2: High (Cam)
      "bg-amber-400",    // Top 3: Medium (Vàng)
      "bg-cyan-500",     // Top 4: Info (Xanh dương)
      "bg-zinc-600",     // Top 5: Baseline (Xám chìm)
    ]
    return colors[Math.min(index, colors.length - 1)]
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
          data.map((row, index) => (
            <div key={row.ip}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-xs text-zinc-200">{row.ip}</span>
                <span className="text-xs font-medium tabular-nums text-zinc-400">
                  {row.events.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${getBarColor(index)}`}
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
