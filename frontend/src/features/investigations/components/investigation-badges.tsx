import { cn } from "@/shared/lib/utils"
import type { SearchMode, AuditStatus } from "@/shared/types/soc"

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
    search: "border-cyan-400/40 bg-cyan-400/12 text-cyan-100 shadow-[0_0_16px_-10px_rgba(34,211,238,0.95)]",
    aggregation: "border-purple-400/40 bg-purple-400/12 text-purple-100 shadow-[0_0_16px_-10px_rgba(168,85,247,0.95)]",
  }
  return <BaseBadge className={styles[mode]}>{mode}</BaseBadge>
}

export function StatusBadge({ status }: { status: AuditStatus }) {
  const styles: Record<AuditStatus, string> = {
    SUCCESS: "border-emerald-400/40 bg-emerald-400/12 text-emerald-100 shadow-[0_0_16px_-10px_rgba(16,185,129,0.95)]",
    FAILED: "border-rose-400/40 bg-rose-400/12 text-rose-100 shadow-[0_0_16px_-10px_rgba(244,63,94,0.95)]",
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
