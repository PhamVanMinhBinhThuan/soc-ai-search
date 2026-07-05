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
    <div className="flex h-full flex-col rounded-2xl border border-[#252A33] bg-[#111318] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[#252A33] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Top Source IPs</h2>
        </div>
        <span className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Live
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">No data available</p>
          </div>
        ) : (
          data.map((row, index) => (
            <div
              key={row.ip}
              className={index === 0 ? "rounded-xl border border-rose-500/20 bg-rose-500/[0.035] p-2" : "p-2"}
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-[10px] font-bold text-zinc-300">
                    #{index + 1}
                  </span>
                  <span className="truncate font-mono text-xs text-zinc-100">{row.ip}</span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-400">
                  {row.events.toLocaleString()} events
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
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
