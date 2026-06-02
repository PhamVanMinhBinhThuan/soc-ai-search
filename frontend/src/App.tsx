import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ConnectionStatus = 'loading' | 'connected' | 'unavailable'

const statusLabels: Record<ConnectionStatus, string> = {
  loading: 'Loading',
  connected: 'Backend connected',
  unavailable: 'Backend unavailable',
}

const statusClasses: Record<ConnectionStatus, string> = {
  loading: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  connected: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  unavailable: 'border-red-400/30 bg-red-400/10 text-red-300',
}

function App() {
  const [status, setStatus] = useState<ConnectionStatus>('loading')

  useEffect(() => {
    const controller = new AbortController()

    async function checkBackendHealth() {
      try {
        const response = await fetch('/api/v1/health/live', {
          signal: controller.signal,
        })
        const health = (await response.json()) as { status?: string }

        setStatus(response.ok && health.status === 'UP' ? 'connected' : 'unavailable')
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setStatus('unavailable')
        }
      }
    }

    void checkBackendHealth()

    return () => controller.abort()
  }, [])

  return (
    <main className="dark grid min-h-svh place-items-center bg-slate-950 px-6 py-12 text-foreground">
      <Card className="w-full max-w-xl border-slate-800 bg-slate-900 shadow-2xl shadow-black/25">
        <CardHeader className="gap-3 px-8 pt-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">
            SOC Platform MVP
          </p>
          <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">
            SOC AI Event Search
          </CardTitle>
          <CardDescription className="text-slate-400">
            Frontend foundation for AI-assisted security event search.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-4">
          <Badge
            variant="outline"
            className={`gap-2 px-3 py-1 ${statusClasses[status]}`}
            aria-live="polite"
          >
            <span className="size-2 rounded-full bg-current" aria-hidden="true" />
            {statusLabels[status]}
          </Badge>
        </CardContent>
      </Card>
    </main>
  )
}

export default App
