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

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toUiError } from '@/services/api-error-messages'
import { refineQuery } from '@/services/query-refinement-api'
import type { ChartMetadataDto, SearchPlanDto } from '@/types/soc'
import { QueryBreakdown } from './query-breakdown'

function JsonViewer({
  value,
  onCopy,
  copyStatus,
}: {
  value: unknown
  onCopy: () => void
  copyStatus: 'idle' | 'copied' | 'failed'
}) {
  return (
    <div className="relative h-[22rem] overflow-auto rounded-xl border border-cyan-400/15 bg-[#071018] shadow-inner shadow-black/30">
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 z-10 border-cyan-400/25 bg-zinc-950/90 text-cyan-100 hover:bg-cyan-400/10"
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
      <pre className="min-w-max p-3 pr-24 font-mono text-xs leading-6 text-cyan-100">
        {JSON.stringify(value, null, 2)}
      </pre>
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
      <div className="relative overflow-hidden rounded-xl border border-cyan-400/15 bg-[#071018] shadow-inner shadow-black/30">
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
          >
            <RotateCcw className="mr-2 size-4" />
            Reset to AI Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isRunning}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={error !== null || isRunning}
            onClick={() => void handleRun()}
            className="bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-cyan-600/50"
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
    <div className="rounded-2xl border border-cyan-400/25 bg-[#07131c]/80 p-4 shadow-[0_0_26px_-20px_#22d3ee]">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
          <Sparkles className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex h-9 items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
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
          className="min-h-28 resize-y rounded-xl border border-cyan-400/20 bg-zinc-950/75 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/10"
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
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleRefine()}
              disabled={isRefining || !refinement.trim()}
              className="bg-cyan-500 text-slate-950 shadow-[0_0_18px_-10px_#22d3ee] hover:bg-cyan-300 disabled:bg-cyan-600/40"
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
    <Card className="gap-0 overflow-hidden border border-cyan-400/25 bg-[#091018]/90 py-0 shadow-[0_0_34px_-24px_#22d3ee]">
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-400/15 bg-cyan-400/[0.035] px-4 py-3">
        <span className="grid size-8 place-items-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200">
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
          <div className="mb-2 flex items-center justify-between">
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="breakdown">
                <ListTree />
                Query Breakdown
              </TabsTrigger>
              <TabsTrigger value="plan">
                <FileJson2 />
                Validated SearchPlan
              </TabsTrigger>
              <TabsTrigger value="dsl">
                <Code2 />
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
                    className="ml-auto border-cyan-400/30 text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-950/30 hover:text-cyan-300"
                  >
                    <Edit2 className="mr-2 size-4" />
                    Edit SearchPlan
                  </Button>
                ) : null}
                {!canEditPlan ? (
                  <span className="ml-auto hidden items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500 sm:inline-flex">
                    SearchPlan editing requires ANALYST or ADMIN.
                  </span>
                ) : null}
              </>
            ) : activeTab === 'dsl' ? (
              <span className="ml-auto hidden items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500 sm:inline-flex">
                Read-only
              </span>
            ) : null}
          </div>

          <TabsContent value="breakdown" className="mt-0 outline-none">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
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
                value={searchPlan}
                copyStatus={
                  copyState?.type === 'plan' ? copyState.status : 'idle'
                }
                onCopy={() => void copyValue('plan', searchPlan)}
              />
            )}
          </TabsContent>

          <TabsContent value="dsl" className="mt-0 outline-none">
            <JsonViewer
              value={generatedDsl}
              copyStatus={
                copyState?.type === 'dsl' ? copyState.status : 'idle'
              }
              onCopy={() => void copyValue('dsl', generatedDsl)}
            />
          </TabsContent>
        </Tabs>
      ) : null}
    </Card>
  )
}
