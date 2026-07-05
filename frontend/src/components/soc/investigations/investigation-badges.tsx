import { cn } from "@/lib/utils"
import type { SearchMode, AuditStatus } from "@/types/soc"

function BaseBadge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ModeBadge({ mode }: { mode: SearchMode | null }) {
  if (!mode) return null

  const styles: Record<SearchMode, string> = {
    search: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    aggregation: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  }
  return <BaseBadge className={styles[mode]}>{mode}</BaseBadge>
}

export function StatusBadge({ status }: { status: AuditStatus }) {
  const styles: Record<AuditStatus, string> = {
    SUCCESS: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    FAILED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  }
  return (
    <BaseBadge className={styles[status]}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "SUCCESS" ? "bg-emerald-400" : "bg-rose-400",
        )}
        aria-hidden
      />
      {status}
    </BaseBadge>
  )
}

export function MetaBadge({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("font-mono font-medium text-zinc-200", className)}>
        {value}
      </span>
    </span>
  )
}
