import { useEffect, useState } from 'react'

type ConnectionStatus = 'loading' | 'connected' | 'unavailable'

const statusLabels: Record<ConnectionStatus, string> = {
  loading: 'Loading',
  connected: 'Backend connected',
  unavailable: 'Backend unavailable',
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
    <main className="page-shell">
      <section className="status-card">
        <p className="eyebrow">SOC Platform MVP</p>
        <h1>SOC AI Event Search</h1>
        <p className={`connection-status connection-status--${status}`}>
          <span className="status-dot" aria-hidden="true" />
          {statusLabels[status]}
        </p>
      </section>
    </main>
  )
}

export default App
