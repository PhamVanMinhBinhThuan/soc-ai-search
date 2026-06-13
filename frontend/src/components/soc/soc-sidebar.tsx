import {
  BellRing,
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Network,
  ScrollText,
  Search,
  Settings,
  ShieldHalf,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const primaryNav = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Search, label: 'Event Search', active: true },
  { icon: BellRing, label: 'Alerts', badge: 18 },
  { icon: ScrollText, label: 'Investigations' },
  { icon: Network, label: 'Network Map' },
  { icon: Bot, label: 'AI Analyst' },
]

function CollapsedTooltip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean
  label: string
  children: ReactNode
}) {
  if (!collapsed) {
    return children
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function SocSidebar() {
  const [expanded, setExpanded] = useState(false)
  const collapsed = !expanded

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar py-4 transition-[width] duration-300 ease-in-out md:flex',
          expanded ? 'w-60' : 'w-16',
        )}
      >
        <div className="mb-5 flex h-10 shrink-0 items-center px-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 shadow-[0_0_22px_-8px_#22d3ee] ring-1 ring-cyan-400/25">
            <ShieldHalf className="size-5" />
          </div>
          <div
            className={cn(
              'overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-300',
              expanded ? 'ml-3 w-36 opacity-100' : 'ml-0 w-0 opacity-0',
            )}
          >
            <span className="block text-sm font-semibold">SOC Console</span>
            <span className="block text-[10px] text-muted-foreground">
              AI Event Search
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-3">
          {primaryNav.map((item) => (
            <CollapsedTooltip
              key={item.label}
              collapsed={collapsed}
              label={item.label}
            >
              <button
                type="button"
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                  expanded ? 'justify-start px-3' : 'justify-center',
                  item.active
                    ? 'bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  {item.label}
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      'rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white',
                      expanded
                        ? 'ml-auto'
                        : 'absolute -top-1 -right-1',
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            </CollapsedTooltip>
          ))}
        </nav>

        <div className="flex flex-col gap-1.5 px-3">
          {[
            { icon: Settings, label: 'Settings' },
            { icon: CircleHelp, label: 'Help & Support' },
          ].map((item) => (
            <CollapsedTooltip
              key={item.label}
              collapsed={collapsed}
              label={item.label}
            >
              <button
                type="button"
                aria-label={item.label}
                className={cn(
                  'flex h-10 w-full shrink-0 items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  expanded ? 'justify-start px-3' : 'justify-center',
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  {item.label}
                </span>
              </button>
            </CollapsedTooltip>
          ))}

          <div
            className={cn(
              'mt-2 flex h-10 items-center',
              expanded ? 'px-1' : 'justify-center',
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold ring-1 ring-border">
              SA
            </div>
            <div
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-300',
                expanded
                  ? 'ml-3 w-32 opacity-100'
                  : 'ml-0 w-0 opacity-0',
              )}
            >
              <span className="block text-xs font-medium">SOC Analyst</span>
              <span className="block text-[10px] text-muted-foreground">
                Local demo
              </span>
            </div>
          </div>

          <CollapsedTooltip
            collapsed={collapsed}
            label="Expand sidebar"
          >
            <button
              type="button"
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              className={cn(
                'mt-2 flex h-9 w-full items-center rounded-lg border border-border bg-background/30 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                expanded ? 'justify-start px-3' : 'justify-center',
              )}
            >
              {expanded ? (
                <ChevronLeft className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap text-xs transition-[width,opacity,margin] duration-300',
                  expanded
                    ? 'ml-3 w-28 opacity-100'
                    : 'ml-0 w-0 opacity-0',
                )}
              >
                Collapse sidebar
              </span>
            </button>
          </CollapsedTooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
