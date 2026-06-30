import {
  AlertCircle,
  Braces,
  Clock3,
  FileText,
  Globe2,
  LockKeyhole,
  Monitor,
  Network,
  RotateCcw,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { CountryCode } from '@/components/soc/country-code'
import { SeverityBadge } from '@/components/soc/severity-badge'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type {
  DetailStatus,
  EventDetailResponseDto,
  UiError,
} from '@/types/soc'

type FieldProps = {
  icon: typeof Clock3
  label: string
  value: ReactNode
  mono?: boolean
}

function Field({ icon: Icon, label, value, mono = true }: FieldProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-1 border-b border-border/70 py-3 last:border-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span
        className={
          mono
            ? 'font-mono text-xs text-foreground sm:text-right'
            : 'text-xs leading-relaxed text-foreground sm:text-right'
        }
      >
        {value}
      </span>
    </div>
  )
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Event Details
            {event ? <SeverityBadge severity={event.severity} /> : null}
          </SheetTitle>
        </SheetHeader>

        {status === 'loading' ? (
          <div
            className="flex min-h-0 flex-1 flex-col gap-4 p-5"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="sr-only">Loading event detail</span>
            <Skeleton className="h-9 w-full" />
            <div className="rounded-xl border border-border bg-background/40 p-4">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 border-b border-border/70 py-3 last:border-0"
                >
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {status === 'error' && error ? (
          <div className="p-5">
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
            className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5"
          >
            <TabsList className="w-full">
              <TabsTrigger value="formatted" className="flex-1">
                <FileText className="size-3.5" />
                Formatted Fields
              </TabsTrigger>
              <TabsTrigger
                value="raw"
                className="flex-1"
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
              <Alert className="border-amber-400/25 bg-amber-500/8">
                <LockKeyhole className="mr-2 inline size-4 text-amber-300" />
                <AlertTitle className="inline text-amber-200">
                  Raw log locked
                </AlertTitle>
                <AlertDescription>
                  This account can view event metadata, but raw log access
                  requires SOC_ANALYST or SOC_ADMIN. The dashboard does not
                  render placeholder raw data.
                </AlertDescription>
              </Alert>
            ) : null}

            <TabsContent
              value="formatted"
              className="min-h-0 overflow-y-auto rounded-xl border border-border bg-background/40 px-4"
            >
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
              className="min-h-0 overflow-auto rounded-xl border border-border bg-[#090b10]"
            >
              {rawLocked ? null : (
                <pre className="whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-7 text-cyan-200">
                  {event.raw}
                </pre>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
