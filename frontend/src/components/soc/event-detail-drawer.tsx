import {
  Braces,
  Clock3,
  Database,
  FileText,
  Globe2,
  Monitor,
  Network,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { CountryCode } from '@/components/soc/country-code'
import { SeverityBadge } from '@/components/soc/severity-badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { EventDetailResponseDto } from '@/types/soc'

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

export function EventDetailDrawer({
  event,
  open,
  onOpenChange,
}: {
  event: EventDetailResponseDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Event Details
            {event ? <SeverityBadge severity={event.severity} /> : null}
          </SheetTitle>
          <SheetDescription className="font-mono">
            <span className="break-all">event_id: {event?.event_id ?? '-'}</span>
          </SheetDescription>
        </SheetHeader>

        {event ? (
          <Tabs
            defaultValue="formatted"
            className="min-h-0 flex-1 overflow-hidden p-3 sm:p-5"
          >
            <TabsList className="w-full">
              <TabsTrigger value="formatted" className="flex-1">
                <FileText className="size-3.5" />
                Formatted Fields
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex-1">
                <Braces className="size-3.5" />
                Raw Log
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="formatted"
              className="min-h-0 overflow-y-auto rounded-xl border border-border bg-background/40 px-4"
            >
              <Field
                icon={Database}
                label="Index"
                value={event.index_name}
              />
              <Field
                icon={Clock3}
                label="Timestamp"
                value={event.timestamp}
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
              <pre className="min-w-max p-4 font-mono text-xs leading-6 text-cyan-200">
                {event.raw}
              </pre>
            </TabsContent>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
