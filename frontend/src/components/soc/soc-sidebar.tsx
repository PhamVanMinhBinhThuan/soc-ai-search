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
  const roleLabel = authLoading
    ? 'Loading role'
    : highestSocRole(roles) ?? (authEnabled ? 'Authenticated' : 'SOC Analyst')
  const avatarSrc = roles.includes('SOC_ADMIN')
    ? '/images/avatar-admin.png'
    : roles.includes('SOC_ANALYST')
      ? '/images/avatar-analyst.png'
      : roles.includes('SOC_VIEWER')
        ? '/images/avatar-viewer.png'
        : '/images/avatar-analyst.png'

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-cyan-300/20 bg-[radial-gradient(circle_at_15%_8%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_90%_100%,rgba(14,165,233,0.08),transparent_36%),#070b12] py-4 shadow-[10px_0_36px_-26px_rgba(34,211,238,0.95)] transition-[width] duration-300 ease-in-out md:flex',
          expanded ? 'w-60' : 'w-16',
        )}
      >
        <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-300/55 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-cyan-300/[0.035] to-transparent" />

        <div className="relative mb-5 flex h-10 shrink-0 items-center px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={expanded ? 'SOC Console' : 'Expand sidebar'}
                aria-expanded={expanded}
                onClick={() => setExpanded(true)}
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_26px_-10px_#22d3ee] ring-1 ring-cyan-300/15 transition-colors hover:border-cyan-200/45 hover:bg-cyan-400/16 hover:text-cyan-50"
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
          <button
            type="button"
            aria-label="Collapse sidebar"
            aria-expanded={expanded}
            onClick={() => setExpanded(false)}
            className={cn(
              'absolute right-3 top-1/2 flex size-8 -translate-y-1/2 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/80 text-zinc-400 transition-colors hover:border-cyan-300/35 hover:bg-zinc-900 hover:text-cyan-100',
              expanded ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <ChevronLeft className="size-4" />
          </button>
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
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40',
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
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40',
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
                'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40',
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
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40',
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

        <div className="mt-auto border-t border-cyan-300/14 px-3 pt-3">
          <div
            className={cn(
              'flex flex-col rounded-2xl border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(3,7,18,0.76))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_22px_-18px_rgba(34,211,238,0.95)] backdrop-blur',
              expanded ? 'gap-2 p-2' : 'items-center gap-2 border-transparent bg-transparent p-0 shadow-none',
            )}
          >
            <div className={cn('flex min-w-0 items-center', expanded ? 'w-full gap-2' : 'justify-center')}>
              <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/25 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.22),transparent_24%),linear-gradient(135deg,rgba(34,211,238,0.26),rgba(15,23,42,0.92))] text-cyan-50 ring-1 ring-cyan-400/20 shadow-[0_0_18px_-10px_rgba(34,211,238,0.9)]">
                <img
                  src={avatarSrc}
                  alt={`${roleLabel} avatar`}
                  className="size-full object-cover"
                />
              </div>
              <div
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-300',
                  expanded ? 'w-32 opacity-100' : 'w-0 opacity-0',
                )}
              >
                <span className="block max-w-32 truncate text-sm font-semibold text-slate-50">
                  {identity}
                </span>
                <span className="block text-xs text-cyan-100/70">
                  {roleLabel}
                </span>
              </div>
            </div>

            {authEnabled && onLogout ? (
              <CollapsedTooltip collapsed={collapsed} label="Sign Out">
                <button
                  type="button"
                  aria-label="Sign Out"
                  onClick={onLogout}
                  className={cn(
                    'flex h-9 shrink-0 items-center rounded-xl border border-cyan-300/16 bg-slate-900/65 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-rose-300/28 hover:bg-rose-400/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/30',
                    expanded ? 'w-full justify-center gap-2 px-3' : 'w-10 justify-center',
                  )}
                >
                  <Power className="size-4 shrink-0" />
                  <span
                    className={cn(
                      'overflow-hidden whitespace-nowrap text-sm font-medium transition-[width,opacity] duration-300',
                      expanded ? 'w-16 opacity-100' : 'w-0 opacity-0',
                    )}
                  >
                    Sign Out
                  </span>
                </button>
              </CollapsedTooltip>
            ) : null}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
