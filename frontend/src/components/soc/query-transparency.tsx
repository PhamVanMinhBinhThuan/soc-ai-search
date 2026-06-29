import { json } from '@codemirror/lang-json'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'
import {
  Check,
  Code2,
  Copy,
  Edit2,
  FileJson2,
  Loader2,
  Play,
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
import type { SearchPlanDto } from '@/types/soc'

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
    <div className="relative h-[22rem] overflow-auto rounded-xl border border-border bg-[#090b10]">
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 z-10 bg-card/90"
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
      <pre className="min-w-max p-3 pr-24 font-mono text-xs leading-6 text-cyan-200">
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
      <div className="relative overflow-hidden rounded-xl border border-border bg-[#090b10]">
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
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isRunning}>
            <RotateCcw className="mr-2 size-4" />
            Reset to AI Plan
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isRunning}>
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

export function QueryTransparency({
  searchPlan,
  resetSearchPlan,
  generatedDsl,
  canEditPlan = false,
  onRunEditedPlan,
}: {
  searchPlan: SearchPlanDto
  resetSearchPlan?: SearchPlanDto
  generatedDsl: Record<string, unknown>
  canEditPlan?: boolean
  onRunEditedPlan?: (plan: SearchPlanDto) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [copyState, setCopyState] = useState<{
    type: 'plan' | 'dsl'
    status: 'copied' | 'failed'
  } | null>(null)
  const [activeTab, setActiveTab] = useState('plan')

  const [prevSearchPlan, setPrevSearchPlan] = useState(searchPlan)

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
    <Card className="gap-0 overflow-hidden border border-border bg-card py-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Code2 className="size-4 text-cyan-300" />
        <h2 className="text-sm font-semibold">Query Transparency</h2>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          aria-expanded={expanded}
          aria-controls="query-transparency-content"
          onClick={() => setExpanded((current) => !current)}
        >
          <span aria-hidden="true" className="mr-1.5 text-[10px]">
            {expanded ? '▲' : '▼'}
          </span>
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {expanded ? (
        <Tabs
          id="query-transparency-content"
          value={activeTab}
          onValueChange={setActiveTab}
          className="px-2 py-2 sm:px-3 sm:py-3"
        >
          <div className="flex items-center justify-between mb-2">
            <TabsList className="max-w-full overflow-x-auto">
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
                {canEditPlan && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="ml-auto text-cyan-400 hover:text-cyan-300 border-cyan-400/30 hover:border-cyan-400/50 hover:bg-cyan-950/30"
                  >
                    <Edit2 className="size-4 mr-2" />
                    Edit SearchPlan
                  </Button>
                )}
                {!canEditPlan && (
                   <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 ml-auto hidden sm:inline-flex items-center">
                     SearchPlan editing requires ANALYST or ADMIN.
                   </span>
                )}
              </>
            ) : (
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 ml-auto hidden sm:inline-flex items-center">
                Read-only
              </span>
            )}
          </div>
          
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
