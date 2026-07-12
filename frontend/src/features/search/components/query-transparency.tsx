import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Edit2,
  FileJson2,
  ListTree,
  Loader2,
  Play,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs'
import { toUiError } from '@/shared/services/api/api-error-messages'
import { refineQuery } from '@/features/search/services/query-refinement-api'
import type { ChartMetadataDto, SearchPlanDto } from '@/shared/types/soc'
import { QueryBreakdown } from './query-breakdown'

function JsonViewer({
  value,
  label,
  onCopy,
  copyStatus,
}: {
  value: unknown
  label: string
  onCopy: () => void
  copyStatus: 'idle' | 'copied' | 'failed'
}) {
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-cyan-200/30 bg-[linear-gradient(145deg,rgba(28,43,64,0.82),rgba(10,18,34,0.96))] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_80px_-46px_rgba(34,211,238,0.9)] backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-cyan-200/20 bg-white/[0.035] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-400/90" />
          <span className="size-2.5 rounded-full bg-amber-400/90" />
          <span className="size-2.5 rounded-full bg-emerald-400/90" />
        </div>
        <span className="font-mono text-xs text-slate-400">{label}</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 border-cyan-300/30 bg-cyan-300/10 text-cyan-50 shadow-[0_0_18px_-9px_#60a5fa] hover:border-cyan-200/70 hover:bg-cyan-300/20 hover:text-white"
          onClick={onCopy}
          aria-label="Copy JSON to clipboard"
        >
          {copyStatus === 'copied' ? (
            <Check className="text-emerald-300" />
          ) : (
            <Copy />
          )}
          {copyStatus === 'copied'
            ? 'Copied'
            : copyStatus === 'failed'
              ? 'Copy failed'
              : 'Copy'}
        </Button>
      </div>
      <div className="h-[22rem] overflow-auto bg-[linear-gradient(180deg,rgba(34,38,55,0.72),rgba(17,24,39,0.92))]">
        <pre className="min-w-max p-4 font-mono text-xs leading-6 text-cyan-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </div>
  )
}

function SearchPlanEditor({
  initialValue,
  resetValue,
  onRun,
  onCancel,
}: {
  initialValue: SearchPlanDto
  resetValue: SearchPlanDto
  onRun: (plan: SearchPlanDto) => Promise<void>
  onCancel: () => void
}) {
  const [code, setCode] = useState(() => JSON.stringify(initialValue, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = async () => {
    try {
      const parsed = JSON.parse(code) as SearchPlanDto
      setError(null)
      setIsRunning(true)
      await onRun(parsed)
    } catch (err) {
      const uiErr = toUiError(err)
      const errorMessage =
        uiErr.errors.length > 0
          ? `${uiErr.message}: ${uiErr.errors.join(', ')}`
          : uiErr.message
      setError(errorMessage)
    } finally {
      setIsRunning(false)
    }
  }

  const handleReset = () => {
    setCode(JSON.stringify(resetValue, null, 2))
    setError(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-[1.35rem] border border-cyan-200/30 bg-[linear-gradient(145deg,rgba(28,43,64,0.82),rgba(10,18,34,0.96))] shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_80px_-46px_rgba(34,211,238,0.9)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-cyan-200/20 bg-white/[0.035] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400/90" />
            <span className="size-2.5 rounded-full bg-amber-400/90" />
            <span className="size-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <span className="font-mono text-xs text-slate-400">search_plan.json</span>
        </div>
        <CodeMirror
          value={code}
          height="22rem"
          theme={oneDark}
          extensions={[json()]}
          onChange={(value) => {
            setCode(value)
            try {
              JSON.parse(value)
              setError(null)
            } catch {
              setError('Invalid JSON format')
            }
          }}
          className="text-xs"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-destructive">
          {error}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isRunning}
            className="border-slate-700 bg-slate-950/60 text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            <RotateCcw className="mr-2 size-4" />
            Reset to AI Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isRunning}
            className="border-slate-700 bg-slate-950/60 text-slate-200 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={error !== null || isRunning}
            onClick={() => void handleRun()}
            className="bg-cyan-400 text-slate-950 shadow-[0_0_20px_-10px_#22d3ee] hover:bg-cyan-300 disabled:bg-cyan-600/50"
          >
            {isRunning ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            Run Edited Plan
          </Button>
        </div>
      </div>
    </div>
  )
}

function QueryRefiner({
  originalQuestion,
  currentQuestion,
  searchPlan,
  onApplyQueryUpdate,
}: {
  originalQuestion: string
  currentQuestion: string
  searchPlan: SearchPlanDto
  onApplyQueryUpdate?: (params: {
    rewrittenQuestion: string
    feedback: string
    originalQuestion: string
  }) => void
}) {
  const [refinement, setRefinement] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRefining, setIsRefining] = useState(false)

  const handleRefine = async () => {
    if (!refinement.trim()) {
      setError('Describe how you want to refine this query.')
      return
    }

    const feedback = refinement.trim()
    setIsRefining(true)
    setError(null)

    try {
      const response = await refineQuery({
        original_question: originalQuestion,
        current_question: currentQuestion,
        current_search_plan: searchPlan,
        refinement: feedback,
      })
      onApplyQueryUpdate?.({
        rewrittenQuestion: response.rewritten_question,
        feedback,
        originalQuestion,
      })
    } catch (err) {
      const uiError = toUiError(err)
      setError(
        [uiError.message, ...uiError.errors].filter(Boolean).join(' '),
      )
    } finally {
      setIsRefining(false)
    }
  }

  const reset = () => {
    setRefinement('')
    setError(null)
  }

  return (
    <div className="h-full rounded-[1.35rem] border border-cyan-200/35 bg-[linear-gradient(145deg,rgba(94,116,126,0.28),rgba(16,40,49,0.76)_38%,rgba(8,19,31,0.94))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_0_1px_rgba(34,211,238,0.07),0_24px_80px_-48px_rgba(125,211,252,0.9)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_20px_-12px_#22d3ee]">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex h-9 items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-50">
              Correct or Refine Query
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <textarea
          value={refinement}
          onChange={(event) => setRefinement(event.target.value)}
          maxLength={500}
          placeholder="Example: Change the time range to last 7 days and include vpn.user"
          className="min-h-32 resize-y rounded-xl border border-cyan-200/20 bg-slate-950/90 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-200/70 focus:ring-2 focus:ring-cyan-300/15"
          aria-label="Correction or refinement note"
        />

        {error ? (
          <div className="rounded-xl border border-rose-400/25 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={isRefining || !refinement.trim()}
              className="border-slate-700 bg-slate-950/50 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-100"
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleRefine()}
              disabled={isRefining || !refinement.trim()}
              className="bg-cyan-300 text-slate-950 shadow-[0_0_22px_-10px_#22d3ee] hover:bg-cyan-200 disabled:bg-cyan-600/40"
            >
              {isRefining ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Refine
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function QueryTransparency({
  searchPlan,
  resetSearchPlan,
  generatedDsl,
  chartMetadata = null,
  canEditPlan = false,
  currentQuestion,
  originalQuestion,
  onRunEditedPlan,
  onApplyQueryUpdate,
}: {
  searchPlan: SearchPlanDto
  resetSearchPlan?: SearchPlanDto
  generatedDsl: Record<string, unknown>
  chartMetadata?: ChartMetadataDto | null
  canEditPlan?: boolean
  currentQuestion?: string
  originalQuestion?: string
  onRunEditedPlan?: (plan: SearchPlanDto) => Promise<void>
  onApplyQueryUpdate?: (params: {
    rewrittenQuestion: string
    feedback: string
    originalQuestion: string
  }) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [copyState, setCopyState] = useState<{
    type: 'plan' | 'dsl'
    status: 'copied' | 'failed'
  } | null>(null)
  const [activeTab, setActiveTab] = useState('breakdown')
  const [prevSearchPlan, setPrevSearchPlan] = useState(searchPlan)
  const ToggleIcon = expanded ? ChevronUp : ChevronDown

  // Reset editing state when search plan changes (render phase instead of effect)
  if (searchPlan !== prevSearchPlan) {
    setIsEditing(false)
    setPrevSearchPlan(searchPlan)
  }

  const copyValue = async (type: 'plan' | 'dsl', value: unknown) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
      setCopyState({ type, status: 'copied' })
    } catch {
      setCopyState({ type, status: 'failed' })
    }
    window.setTimeout(() => setCopyState(null), 1400)
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-[1.35rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(99,102,241,0.12),transparent_30%),linear-gradient(180deg,rgba(8,19,31,0.94),rgba(2,6,23,0.96))] py-0 shadow-[0_24px_80px_-54px_rgba(34,211,238,0.9)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-300/15 bg-cyan-300/[0.035] px-4 py-3">
        <span className="grid size-8 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
          <Code2 className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-slate-50">Query Transparency</h2>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-7 text-slate-400 hover:bg-cyan-400/10 hover:text-cyan-100"
          aria-expanded={expanded}
          aria-controls="query-transparency-content"
          aria-label={expanded ? 'Collapse query transparency' : 'Expand query transparency'}
          onClick={() => setExpanded((current) => !current)}
        >
          <ToggleIcon className="size-4" />
        </Button>
      </div>

      {expanded ? (
        <Tabs
          id="query-transparency-content"
          value={activeTab}
          onValueChange={setActiveTab}
          className="px-2 py-2 sm:px-3 sm:py-3"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <TabsList className="h-auto max-w-full justify-start overflow-x-auto rounded-full border border-slate-700/50 bg-slate-950/55 p-1 text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <TabsTrigger
                value="breakdown"
                onClick={() => setActiveTab('breakdown')}
                className="gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-400 data-[state=active]:bg-cyan-300/15 data-[state=active]:text-cyan-50 data-[state=active]:shadow-[0_0_20px_-10px_#60a5fa]"
              >
                <ListTree className="size-4" />
                Query Breakdown
              </TabsTrigger>
              <TabsTrigger
                value="plan"
                onClick={() => setActiveTab('plan')}
                className="gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-400 data-[state=active]:bg-cyan-300/15 data-[state=active]:text-cyan-50 data-[state=active]:shadow-[0_0_20px_-10px_#60a5fa]"
              >
                <FileJson2 className="size-4" />
                Validated SearchPlan
              </TabsTrigger>
              <TabsTrigger
                value="dsl"
                onClick={() => setActiveTab('dsl')}
                className="gap-2 rounded-full px-3 py-2 text-xs font-semibold text-slate-400 data-[state=active]:bg-cyan-300/15 data-[state=active]:text-cyan-50 data-[state=active]:shadow-[0_0_20px_-10px_#60a5fa]"
              >
                <Code2 className="size-4" />
                Compiled DSL
              </TabsTrigger>
            </TabsList>

            {activeTab === 'plan' ? (
              <>
                {canEditPlan && !isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="ml-auto border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_-12px_#22d3ee] hover:border-cyan-300/60 hover:bg-cyan-300/15 hover:text-cyan-50"
                  >
                    <Edit2 className="mr-2 size-4" />
                    Edit SearchPlan
                  </Button>
                ) : null}
                {!canEditPlan ? (
                  <span className="ml-auto hidden items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:inline-flex">
                    SearchPlan editing requires ANALYST or ADMIN.
                  </span>
                ) : null}
              </>
            ) : activeTab === 'dsl' ? (
              <span className="ml-auto hidden items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:inline-flex">
                Read-only
              </span>
            ) : null}
          </div>

          <TabsContent value="breakdown" className="mt-0 outline-none">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.8fr)]">
              <QueryBreakdown
                searchPlan={searchPlan}
                chartMetadata={chartMetadata}
              />
              {onApplyQueryUpdate && currentQuestion ? (
                <div>
                  <QueryRefiner
                    originalQuestion={originalQuestion ?? currentQuestion}
                    currentQuestion={currentQuestion}
                    searchPlan={searchPlan}
                    onApplyQueryUpdate={onApplyQueryUpdate}
                  />
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="plan" className="mt-0 outline-none">
            <div className="mx-auto max-w-5xl rounded-[1.6rem] border border-cyan-200/15 bg-cyan-300/[0.025] p-2 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_24px_90px_-58px_rgba(34,211,238,0.95)]">
              {isEditing ? (
                <SearchPlanEditor
                  initialValue={searchPlan}
                  resetValue={resetSearchPlan ?? searchPlan}
                  onCancel={() => setIsEditing(false)}
                  onRun={async (editedPlan) => {
                    await onRunEditedPlan?.(editedPlan)
                  }}
                />
              ) : (
                <JsonViewer
                  label="search_plan.json"
                  value={searchPlan}
                  copyStatus={
                    copyState?.type === 'plan' ? copyState.status : 'idle'
                  }
                  onCopy={() => void copyValue('plan', searchPlan)}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="dsl" className="mt-0 outline-none">
            <div className="mx-auto max-w-5xl rounded-[1.6rem] border border-cyan-200/15 bg-cyan-300/[0.025] p-2 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_24px_90px_-58px_rgba(34,211,238,0.95)]">
              <JsonViewer
                label="compiled_dsl.json"
                value={generatedDsl}
                copyStatus={
                  copyState?.type === 'dsl' ? copyState.status : 'idle'
                }
                onCopy={() => void copyValue('dsl', generatedDsl)}
              />
            </div>
          </TabsContent>
        </Tabs>
      ) : null}
    </Card>
  )
}
