import {
  ChevronLeft,
  History,
  LayoutDashboard,
  Library,
  Power,
  ScrollText,
  Search,
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
  { icon: LayoutDashboard, label: 'Dashboard', pageId: 'dashboard' as const },
  { icon: Search, label: 'Event Search', pageId: 'search' as const },
]

const activeNavClass =
  'border-l-2 border-l-cyan-300 bg-[linear-gradient(90deg,rgba(0,224,255,.22),rgba(255,45,85,.05))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_24px_-10px_rgba(34,211,238,0.95)] ring-1 ring-cyan-300/30'

const inactiveNavClass =
  'border-l-2 border-l-transparent text-muted-foreground hover:bg-cyan-400/[0.07] hover:text-cyan-100'

const investigationsNav = {
  icon: ScrollText,
  label: 'Investigations',
  pageId: 'investigations' as const,
  children: [
    { label: 'All Investigations', action: 'page' as const },
    { label: 'Recent Queries', action: 'drawer' as const },
  ]
}

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
  onOpenAuditLogs,
  onLogout,
}: {
  identity: string
  roles: string[]
  authLoading: boolean
  authEnabled: boolean
  activePage?: 'dashboard' | 'search' | 'investigations' | 'audit-logs' | 'query-library'
  onPageChange?: (page: 'dashboard' | 'search' | 'investigations' | 'audit-logs' | 'query-library') => void
  onOpenAuditLogs?: () => void
  onLogout?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const collapsed = !expanded
  const permissionContext = { roles, loading: authLoading }
  const historyVisible = canViewHistory(permissionContext)
  const adminVisible = canViewAuditLogs(permissionContext)
  const visiblePrimaryNav = primaryNav
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
          'sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-cyan-400/15 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.12),transparent_30%),#0B0E13] py-4 transition-[width] duration-300 ease-in-out md:flex',
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
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/12 text-cyan-200 shadow-[0_0_24px_-7px_#22d3ee] ring-1 ring-cyan-300/35 transition-colors hover:bg-cyan-400/18 hover:text-cyan-50"
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
            <span className="block text-base font-semibold text-zinc-50 drop-shadow-[0_0_12px_rgba(34,211,238,0.25)]">SOC Console</span>
            <span className="block text-xs text-muted-foreground">
              Events Search
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
                <ChevronLeft className="size-3.5" />
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
                  activePage === item.pageId ? activeNavClass : inactiveNavClass,
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

          {historyVisible ? (
            <CollapsedTooltip
              collapsed={collapsed}
              label={investigationsNav.label}
            >
              <button
                type="button"
                aria-label={investigationsNav.label}
                aria-current={activePage === investigationsNav.pageId ? 'page' : undefined}
                onClick={() => onPageChange?.(investigationsNav.pageId)}
                className={cn(
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                  expanded ? 'justify-start px-3' : 'justify-center',
                  activePage === investigationsNav.pageId ? activeNavClass : inactiveNavClass,
                )}
              >
                <investigationsNav.icon className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  {investigationsNav.label}
                </span>
              </button>
            </CollapsedTooltip>
          ) : null}

          {/* Query Library */}
          <CollapsedTooltip collapsed={collapsed} label="Query Library">
            <button
              type="button"
              aria-label="Query Library"
              aria-current={activePage === 'query-library' ? 'page' : undefined}
              onClick={() => onPageChange?.('query-library')}
              className={cn(
                'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                expanded ? 'justify-start px-3' : 'justify-center',
                activePage === 'query-library' ? activeNavClass : inactiveNavClass,
              )}
            >
              <Library className="size-5 shrink-0" />
              <span
                className={cn(
                  'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                  expanded
                    ? 'ml-3 w-36 opacity-100'
                    : 'ml-0 w-0 opacity-0',
                )}
              >
                Query Library
              </span>
            </button>
          </CollapsedTooltip>

          {adminVisible ? (
            <CollapsedTooltip collapsed={collapsed} label="System Audit Logs">
              <button
                type="button"
                aria-label="System Audit Logs"
                aria-current={activePage === 'audit-logs' ? 'page' : undefined}
                onClick={() => {
                  onOpenAuditLogs?.()
                  onPageChange?.('audit-logs')
                }}
                className={cn(
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                  expanded ? 'justify-start px-3' : 'justify-center',
                  activePage === 'audit-logs' ? activeNavClass : inactiveNavClass,
                )}
              >
                <History className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  System Audit Logs
                </span>
              </button>
            </CollapsedTooltip>
          ) : null}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 px-3">
          {authEnabled && onLogout ? (
            <CollapsedTooltip collapsed={collapsed} label="Sign Out">
              <button
                type="button"
                aria-label="Sign Out"
                onClick={onLogout}
                className={cn(
                  'flex h-10 w-full shrink-0 items-center rounded-xl transition-colors text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400',
                  expanded ? 'justify-start px-3' : 'justify-center',
                )}
              >
                <Power className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  Sign Out
                </span>
              </button>
            </CollapsedTooltip>
          ) : null}

          <div
            className={cn(
              'mt-2 flex h-12 items-center rounded-2xl border border-cyan-400/15 bg-[#111318]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_18px_-16px_rgba(34,211,238,0.9)]',
              expanded ? 'px-2' : 'justify-center border-transparent bg-transparent shadow-none',
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-50 ring-1 ring-cyan-400/25 shadow-[0_0_18px_-10px_rgba(34,211,238,0.9)]">
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
