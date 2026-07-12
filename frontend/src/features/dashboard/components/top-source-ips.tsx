import type { TopSourceIpItem } from "@/shared/types/soc"

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
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(17,19,24,0.94))] shadow-[0_0_30px_-18px_rgba(34,211,238,0.88),inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.045)_1px,transparent_1px)] bg-[size:24px_24px] opacity-25" />
      <div className="relative flex shrink-0 items-center justify-between border-b border-cyan-400/20 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Top Source IPs</h2>
        </div>
        <span className="rounded border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-200/70">
          Live
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">No data available</p>
          </div>
        ) : (
          data.map((row, index) => (
            <div
              key={row.ip}
              className={index === 0 ? "rounded-xl border border-rose-400/35 bg-rose-500/[0.06] p-1.5 shadow-[0_0_18px_-12px_rgba(244,63,94,0.9)]" : "rounded-xl border border-transparent p-1.5 hover:border-cyan-400/15 hover:bg-cyan-400/[0.035]"}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-bold text-cyan-100">
                    #{index + 1}
                  </span>
                  <span className="truncate font-mono text-xs text-zinc-100">{row.ip}</span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-cyan-100/80">
                  {row.events.toLocaleString()} events
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-950/80">
                <div
                  className={`h-full rounded-full ${getBarColor(index)} shadow-[0_0_12px_rgba(34,211,238,0.4)]`}
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
