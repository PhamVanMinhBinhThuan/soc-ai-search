import {
  ScrollText,
  Search,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import {
  canViewAuditLogs,
  canViewHistory,
  highestSocRole,
} from '@/auth/permissions'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const primaryNav = [
  { icon: Search, label: 'Event Search', pageId: 'search' as const },
  { icon: ScrollText, label: 'Investigations', pageId: 'investigations' as const },
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

export function SocSidebar({
  identity,
  roles,
  authLoading,
  authEnabled,
  activePage,
  onPageChange,
}: {
  identity: string
  roles: string[]
  authLoading: boolean
  authEnabled: boolean
  activePage?: 'search' | 'investigations'
  onPageChange?: (page: 'search' | 'investigations') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const collapsed = !expanded
  const permissionContext = { roles, loading: authLoading }
  const historyVisible = canViewHistory(permissionContext)
  const adminVisible = canViewAuditLogs(permissionContext)
  const visiblePrimaryNav = primaryNav.filter(
    (item) => item.label !== 'Investigations' || historyVisible,
  )
  const initials = identity
    .split(/[.@_\-\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'DA'
  const roleLabel = authLoading
    ? 'Loading role'
    : highestSocRole(roles) ?? (authEnabled ? 'Authenticated' : 'SOC Analyst')

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar py-4 transition-[width] duration-300 ease-in-out md:flex',
          expanded ? 'w-60' : 'w-16',
        )}
      >
        <div className="mb-5 flex h-10 shrink-0 items-center px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Expand sidebar"
                aria-expanded={expanded}
                onClick={() => setExpanded(true)}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 shadow-[0_0_22px_-8px_#22d3ee] ring-1 ring-cyan-400/25 transition-colors hover:bg-cyan-400/15 hover:text-cyan-100"
              >
                <ShieldHalf className="size-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
          <div
            className={cn(
              'overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-300',
              expanded ? 'ml-3 w-36 opacity-100' : 'ml-0 w-0 opacity-0',
            )}
          >
            <span className="block text-base font-semibold">SOC Console</span>
            <span className="block text-xs text-muted-foreground">
              AI Event Search
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Collapse sidebar"
                aria-expanded={expanded}
                onClick={() => setExpanded(false)}
                className={cn(
                  'ml-auto flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/30 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {'<'}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Collapse sidebar</TooltipContent>
          </Tooltip>
        </div>

        <nav className="flex flex-col gap-1.5 px-3">
          {visiblePrimaryNav.map((item) => (
            <CollapsedTooltip
              key={item.label}
              collapsed={collapsed}
              label={item.label}
            >
              <button
                type="button"
                aria-label={item.label}
                aria-current={activePage === item.pageId ? 'page' : undefined}
                onClick={() => onPageChange?.(item.pageId)}
                className={cn(
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                  expanded ? 'justify-start px-3' : 'justify-center',
                  activePage === item.pageId
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
              </button>
            </CollapsedTooltip>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 px-3">
          {adminVisible ? (
            <CollapsedTooltip collapsed={collapsed} label="Admin Console">
              <button
                type="button"
                aria-label="Admin Console"
                title="Open Keycloak Admin Console"
                onClick={() =>
                  window.open(
                    import.meta.env.VITE_KEYCLOAK_ADMIN_URL ??
                      'http://localhost:8080/admin/master/console/#/soc-ai-search',
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
                className={cn(
                  'flex h-10 w-full shrink-0 items-center rounded-xl border border-amber-400/15 bg-amber-400/8 text-amber-200 transition-colors hover:bg-amber-400/15 hover:text-amber-100',
                  expanded ? 'justify-start px-3' : 'justify-center',
                )}
              >
                <ShieldCheck className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  Admin Console
                </span>
              </button>
            </CollapsedTooltip>
          ) : null}

          <div
            className={cn(
              'mt-2 flex h-12 items-center',
              expanded ? 'px-1' : 'justify-center',
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold ring-1 ring-border">
              {initials}
            </div>
            <div
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-300',
                expanded
                  ? 'ml-3 w-32 opacity-100'
                  : 'ml-0 w-0 opacity-0',
              )}
            >
              <span className="block max-w-32 truncate text-sm font-medium">
                {identity}
              </span>
              <span className="block text-xs text-muted-foreground">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
