import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Severity } from '@/types/soc'

const severityClass: Record<Severity, string> = {
  critical:
    'border-rose-400/30 bg-rose-500/15 text-rose-300 shadow-[0_0_14px_-8px_#fb7185]',
  high: 'border-orange-400/30 bg-orange-500/15 text-orange-300',
  medium: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  low: 'border-sky-400/30 bg-sky-500/15 text-sky-300',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 capitalize', severityClass[severity])}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {severity}
    </Badge>
  )
}
