import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  FileJson2,
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
    <div className="relative h-80 overflow-auto rounded-xl border border-border bg-[#090b10]">
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
      <pre className="min-w-max p-4 pr-24 font-mono text-xs leading-6 text-cyan-200">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

export function QueryTransparency({
  searchPlan,
  generatedDsl,
}: {
  searchPlan: SearchPlanDto
  generatedDsl: Record<string, unknown>
}) {
  const [expanded, setExpanded] = useState(true)
  const [copyState, setCopyState] = useState<{
    type: 'plan' | 'dsl'
    status: 'copied' | 'failed'
  } | null>(null)

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
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Natural Language -&gt; Elasticsearch DSL
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          aria-expanded={expanded}
          aria-controls="query-transparency-content"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <ChevronUp /> : <ChevronDown />}
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {expanded ? (
        <Tabs
          id="query-transparency-content"
          defaultValue="plan"
          className="p-3 sm:p-4"
        >
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
          <TabsContent value="plan">
            <JsonViewer
              value={searchPlan}
              copyStatus={
                copyState?.type === 'plan' ? copyState.status : 'idle'
              }
              onCopy={() => void copyValue('plan', searchPlan)}
            />
          </TabsContent>
          <TabsContent value="dsl">
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
