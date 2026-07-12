import { useState } from "react"
import { Check, Copy, Download, Pin, PinOff, RotateCw, Sparkles, X } from "lucide-react"
import { parseAiCorrectedQuestion } from "@/shared/lib/audit-question-format"
import { cn } from "@/shared/lib/utils"
import type { SearchHistoryDetailDto } from "@/shared/types/soc"
import { MetaBadge, ModeBadge, StatusBadge } from "./investigation-badges"
import { QueryBreakdown } from "@/features/search/components/query-breakdown"

type TabKey = "breakdown" | "plan" | "dsl"

function highlight(code: string) {
  const lines = code.split("\n")
  return lines.map((line, i) => {
    const tokens: React.ReactNode[] = []
    const regex =
      /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*\b)|(\btrue\b|\bfalse\b|\bnull\b)|(\/\*[\s\S]*?\*\/|\/\/.*$)/g
    let last = 0
    let m: RegExpExecArray | null
    let k = 0
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) {
        tokens.push(
          <span key={`${i}-t-${k++}`} className="text-zinc-400">
            {line.slice(last, m.index)}
          </span>,
        )
      }
      let cls = "text-zinc-300"
      if (m[1]) cls = "text-cyan-300"
      else if (m[2]) cls = "text-emerald-300"
      else if (m[3]) cls = "text-amber-300"
      else if (m[4]) cls = "text-purple-300"
      else if (m[5]) cls = "text-zinc-600 italic"
      tokens.push(
        <span key={`${i}-m-${k++}`} className={cls}>
          {m[0]}
        </span>,
      )
      last = m.index + m[0].length
    }
    if (last < line.length) {
      tokens.push(
        <span key={`${i}-e`} className="text-zinc-400">
          {line.slice(last)}
        </span>,
      )
    }
    return (
      <div key={i} className="table-row">
        <span className="table-cell select-none pr-4 text-right font-mono text-xs text-zinc-700">
          {i + 1}
        </span>
        <span className="table-cell whitespace-pre">{tokens}</span>
      </div>
    )
  })
}

export function InvestigationDetailPanel({
  item,
  onClose,
  onPinToggle,
  onRunAgain,
  onExport,
  canExport,
  showQueryId = false,
  showPinAction = false,
  showExportAction = Boolean(onExport),
  showLatency = false,
}: {
  item: SearchHistoryDetailDto
  onClose: () => void
  onPinToggle?: (pinned: boolean) => void
  onRunAgain?: () => void
  onExport?: () => void
  canExport?: boolean
  showQueryId?: boolean
  showPinAction?: boolean
  showExportAction?: boolean
  showLatency?: boolean
}) {
  const [tab, setTab] = useState<TabKey>("breakdown")
  const [copied, setCopied] = useState(false)

  const codeObj = tab === "plan" ? item.search_plan : item.generated_dsl
  const hasCode =
    tab !== "breakdown" &&
    codeObj !== null &&
    codeObj !== undefined &&
    (!isPlainRecord(codeObj) || Object.keys(codeObj).length > 0)
  const code = hasCode ? JSON.stringify(codeObj, null, 2) : ""
  const date = new Date(item.created_at)
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const fullTimeStr = `${dateStr} ${timeStr}`
  const summary = item.summary?.trim()
  const aiCorrectedQuestion = parseAiCorrectedQuestion(item.question)

  async function copyCode() {
    if (!hasCode) {
      return
    }
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 p-4">
        <div className="min-w-0">
          <h2 className="text-balance text-lg font-semibold leading-tight text-zinc-100">
            {aiCorrectedQuestion ? "[AI Corrected]" : item.question}
          </h2>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            {showQueryId ? `${item.query_id} · ${fullTimeStr}` : fullTimeStr}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showPinAction && onPinToggle && (
            <button
              title={item.pinned ? "Unpin query" : "Pin query"}
              onClick={() => onPinToggle(!item.pinned)}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-md border transition",
                item.pinned
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100",
              )}
            >
              {item.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
            </button>
          )}
          {onRunAgain && (
            <button
              onClick={onRunAgain}
              className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20"
            >
              <RotateCw className="size-3.5" />
              Run Again
            </button>
          )}
          {showExportAction && onExport && (
            <button
              onClick={onExport}
              disabled={!canExport || item.status !== "SUCCESS"}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-3.5" />
              Export CSV
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close detail panel"
            className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {aiCorrectedQuestion ? (
          <div className="mb-4 grid gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Original question
              </p>
              <p className="mt-1 text-zinc-200">{aiCorrectedQuestion.original}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Feedback
              </p>
              <p className="mt-1 text-zinc-200">{aiCorrectedQuestion.feedback}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Rewritten question
              </p>
              <p className="mt-1 text-zinc-200">{aiCorrectedQuestion.rewritten}</p>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge mode={item.mode} />
          <StatusBadge status={item.status} />
          {showLatency && (
            <MetaBadge
              label="Latency"
              value={`${item.latency_ms ?? "-"}ms`}
              className={(item.latency_ms ?? 0) > 1000 ? "text-rose-300" : "text-emerald-300"}
            />
          )}
          <MetaBadge label="Results" value={item.result_count?.toLocaleString() ?? "-"} />
        </div>

        {summary && (
          <div className="relative mt-4 overflow-hidden rounded-lg border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.07] to-cyan-500/[0.05] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-purple-300" />
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-200">
                AI Summary
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300 text-pretty">
              {summary}
            </p>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center gap-1 border-b border-zinc-800">
            {[
              { key: "breakdown", label: "Query Breakdown" },
              { key: "plan", label: "Validated SearchPlan" },
              { key: "dsl", label: "Compiled DSL" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as TabKey)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-xs font-medium transition",
                  tab === t.key
                    ? "border-cyan-400 text-cyan-300"
                    : "border-transparent text-zinc-500 hover:text-zinc-300",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "breakdown" ? (
            <QueryBreakdown searchPlan={item.search_plan} className="mt-3" />
          ) : (
            <div className="relative mt-3 overflow-hidden rounded-lg border border-zinc-800 bg-[#0a0a0c]">
              <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-rose-500/70" />
                  <span className="size-2.5 rounded-full bg-amber-500/70" />
                  <span className="size-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-500">
                    {tab === "plan" ? "search_plan.json" : "compiled.dsl"}
                  </span>
                </div>
                <button
                  onClick={copyCode}
                  disabled={!hasCode}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Copy code"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="overflow-x-auto p-4">
                {hasCode ? (
                  <div className="table font-mono text-[13px] leading-relaxed">
                    {highlight(code)}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    {tab === "plan"
                      ? "No SearchPlan stored for this query."
                      : "No compiled DSL stored for this query."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
