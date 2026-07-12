import {
  AlertCircle,
  Braces,
  Clock3,
  Copy,
  FileText,
  Globe2,
  Hash,
  LockKeyhole,
  Monitor,
  Network,
  RotateCcw,
  UserRound,
  X,
} from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'

import { CountryCode } from '@/shared/components/display/country-code'
import { SeverityBadge } from '@/shared/components/display/severity-badge'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs'
import type {
  DetailStatus,
  EventDetailResponseDto,
  UiError,
} from '@/shared/types/soc'

type FieldProps = {
  icon: typeof Clock3
  label: string
  value: ReactNode
  mono?: boolean
}

function Field({ icon: Icon, label, value, mono = true }: FieldProps) {
  const isMessage = label === 'Message'

  return (
    <div
      className={
        isMessage
          ? 'grid grid-cols-1 items-start gap-2 rounded-xl border border-cyan-300/12 bg-cyan-300/[0.055] px-3 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3'
          : 'grid grid-cols-1 items-start gap-2 border-b border-cyan-300/12 px-3 py-3 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3'
      }
    >
      <span className="flex items-center gap-2 text-sm font-medium text-slate-400">
        <Icon className="size-4 text-cyan-200/65" />
        {label}
      </span>
      <span
        className={
          mono
            ? 'break-words font-mono text-sm font-semibold text-slate-100 sm:text-right'
            : 'text-sm leading-relaxed text-slate-100 sm:text-right'
        }
      >
        {value}
      </span>
    </div>
  )
}

function copyToClipboard(value: string) {
  if (navigator.clipboard) {
    void navigator.clipboard.writeText(value)
  }
}

function formatEventTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date).replace(/\b(am|pm)\b/i, (period) => period.toUpperCase())
}

export function EventDetailDrawer({
  event,
  status,
  error,
  open,
  onOpenChange,
  onRetry,
  canViewRawLog,
}: {
  event: EventDetailResponseDto | null
  status: DetailStatus
  error: UiError | null
  canViewRawLog: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onRetry: () => void
}) {
  const rawLocked =
    status === 'success' &&
    event !== null &&
    (!canViewRawLog || !event.raw_visible || event.raw === null)

  if (!open) {
    return null
  }

  const close = () => onOpenChange(false)
  const handleBackdropMouseDown = (mouseEvent: MouseEvent<HTMLDivElement>) => {
    if (mouseEvent.target === mouseEvent.currentTarget) {
      close()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/76 px-4 py-6 backdrop-blur-[7px]"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-details-title"
        className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-400/20 bg-[#142238]/95 shadow-[0_24px_90px_-48px_rgba(0,0,0,0.98),0_0_38px_-28px_#93c5fd]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(96,165,250,0.08),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(148,163,184,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.7)_1px,transparent_1px)] [background-size:28px_28px]" />

        <div className="relative flex items-center gap-3 border-b border-slate-500/18 px-5 py-4">
          <h2
            id="event-details-title"
            className="flex min-w-0 items-center gap-3 text-lg font-semibold text-slate-100"
          >
            Event Details
            {event ? <SeverityBadge severity={event.severity} /> : null}
          </h2>
          <button
            type="button"
            aria-label="Close event details"
            onClick={close}
            className="ml-auto grid size-8 place-items-center rounded-lg border border-transparent text-slate-400 transition hover:border-slate-400/20 hover:bg-slate-300/10 hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:outline-none"
          >
            <X className="size-4" />
          </button>
        </div>

        {status === 'loading' ? (
          <div
            className="relative flex min-h-0 flex-1 flex-col gap-4 p-5"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="sr-only">Loading event detail</span>
            <Skeleton className="h-11 w-full rounded-xl bg-slate-800/80" />
            <div className="rounded-2xl border border-cyan-300/12 bg-slate-950/35 p-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 border-b border-cyan-300/12 py-3 last:border-0"
                >
                  <Skeleton className="h-3 w-24 bg-slate-800/80" />
                  <Skeleton className="h-3 w-40 bg-slate-800/80" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {status === 'error' && error ? (
          <div className="relative p-5">
            <Alert className="border-rose-400/30 bg-rose-500/8">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-300" />
                <div className="min-w-0 flex-1">
                  <AlertTitle className="text-rose-200">
                    {error.status === 404
                      ? 'Event not found'
                      : 'Event detail unavailable'}
                  </AlertTitle>
                  <AlertDescription>
                    {error.message}
                    {error.status > 0 ? (
                      <span className="mt-2 block font-mono text-[11px]">
                        HTTP status: {error.status}
                      </span>
                    ) : null}
                  </AlertDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onRetry}
              >
                <RotateCcw />
                Retry
              </Button>
            </Alert>
          </div>
        ) : null}

        {status === 'success' && event ? (
          <Tabs
            defaultValue="formatted"
            className="relative min-h-0 flex-1 overflow-hidden p-4 sm:p-5"
          >
            <TabsList className="h-12 w-full rounded-xl border border-slate-400/16 bg-slate-800/55 p-1 shadow-inner shadow-black/25">
              <TabsTrigger
                value="formatted"
                className="h-10 flex-1 rounded-lg text-sm font-semibold text-slate-400 data-[state=active]:border data-[state=active]:border-cyan-300/35 data-[state=active]:bg-slate-950/55 data-[state=active]:text-slate-50 data-[state=active]:shadow-[0_0_24px_-11px_#22d3ee]"
              >
                <FileText className="size-3.5" />
                Formatted Fields
              </TabsTrigger>
              <TabsTrigger
                value="raw"
                className="h-10 flex-1 rounded-lg text-sm font-semibold text-slate-400 data-[state=active]:border data-[state=active]:border-cyan-300/35 data-[state=active]:bg-slate-950/55 data-[state=active]:text-slate-50 data-[state=active]:shadow-[0_0_24px_-11px_#22d3ee]"
                disabled={rawLocked}
                title={
                  rawLocked
                    ? 'Raw log requires SOC_ANALYST or SOC_ADMIN role'
                    : undefined
                }
              >
                <Braces className="size-3.5" />
                Raw Log
              </TabsTrigger>
            </TabsList>

            {rawLocked ? (
              <Alert className="mt-3 border-amber-400/25 bg-amber-500/8 py-3">
                <LockKeyhole className="mr-2 inline size-4 text-amber-300" />
                <AlertTitle className="inline text-amber-200">
                  Raw log locked
                </AlertTitle>
              </Alert>
            ) : null}

            <TabsContent
              value="formatted"
              className="mt-3 min-h-0 overflow-y-auto rounded-xl border border-slate-400/16 bg-slate-950/24 p-3 shadow-inner shadow-black/25"
            >
              <Field
                icon={Hash}
                label="Event ID"
                value={
                  <span className="inline-flex min-w-0 items-center justify-end gap-2">
                    <span className="min-w-0 truncate">{event.event_id}</span>
                    <button
                      type="button"
                      className="grid size-7 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/20 focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:outline-none"
                      aria-label="Copy event ID"
                      onClick={() => copyToClipboard(event.event_id)}
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </span>
                }
              />
              <Field
                icon={Clock3}
                label="Timestamp"
                value={formatEventTimestamp(event.timestamp)}
              />
              <Field icon={Network} label="Source" value={event.source} />
              <Field
                icon={Braces}
                label="Event Type"
                value={event.event_type}
              />
              <Field icon={UserRound} label="User" value={event.user} />
              <Field icon={Monitor} label="Host" value={event.host} />
              <Field icon={Globe2} label="Source IP" value={event.ip} />
              <Field
                icon={Globe2}
                label="Country Code"
                value={<CountryCode code={event.country_code} />}
              />
              <Field
                icon={FileText}
                label="Message"
                value={event.message}
                mono={false}
              />
            </TabsContent>

            <TabsContent
              value="raw"
              className="mt-3 min-h-0 overflow-auto rounded-xl border border-slate-400/16 bg-[#07111d]"
            >
              {rawLocked ? null : (
                <>
                  <div className="flex items-center gap-3 border-b border-cyan-300/12 bg-slate-900/55 px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-rose-400/90" />
                      <span className="size-2.5 rounded-full bg-amber-400/90" />
                      <span className="size-2.5 rounded-full bg-emerald-400/90" />
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      raw_event.log
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-7 text-cyan-100">
                    {event.raw}
                  </pre>
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </div>
  )
}
