import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  Library,
  ListFilter,
  Power,
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
  { icon: LayoutDashboard, label: 'Dashboard', pageId: 'dashboard' as const },
  { icon: Search, label: 'Event Search', pageId: 'search' as const },
]

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
  onOpenHistory,
  onOpenAuditLogs,
  onLogout,
}: {
  identity: string
  roles: string[]
  authLoading: boolean
  authEnabled: boolean
  activePage?: 'dashboard' | 'search' | 'investigations' | 'audit-logs' | 'query-library'
  onPageChange?: (page: 'dashboard' | 'search' | 'investigations' | 'audit-logs' | 'query-library') => void
  onOpenHistory?: () => void
  onOpenAuditLogs?: () => void
  onLogout?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [investigationsOpen, setInvestigationsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
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

          {historyVisible ? (
            <div className="flex flex-col">
              <CollapsedTooltip
                collapsed={collapsed}
                label={investigationsNav.label}
              >
                <button
                  type="button"
                  aria-label={investigationsNav.label}
                  onClick={() => {
                    if (collapsed) {
                      setExpanded(true)
                      setInvestigationsOpen(true)
                    } else {
                      setInvestigationsOpen(!investigationsOpen)
                    }
                  }}
                  className={cn(
                    'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                    expanded ? 'justify-start px-3' : 'justify-center',
                    activePage === investigationsNav.pageId
                      ? 'bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
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
                  {expanded && (
                    <span className="ml-auto flex items-center justify-center opacity-60">
                      {investigationsOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </span>
                  )}
                </button>
              </CollapsedTooltip>

              {expanded && investigationsOpen && (
                <div className="ml-8 mt-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => onPageChange?.('investigations')}
                    className={cn(
                      'flex h-8 items-center gap-2 rounded-lg px-3 text-sm transition-colors text-left w-full',
                      activePage === 'investigations'
                        ? 'bg-cyan-400/10 text-cyan-300'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <ListFilter className="size-3.5 shrink-0" />
                    All Investigations
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenHistory?.()}
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors text-left text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <History className="size-3.5 shrink-0" />
                    Recent Queries
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Guide group */}
          <div className="flex flex-col">
            <CollapsedTooltip collapsed={collapsed} label="Guide">
              <button
                type="button"
                aria-label="Guide"
                onClick={() => {
                  if (collapsed) {
                    setExpanded(true)
                    setGuideOpen(true)
                  } else {
                    setGuideOpen(!guideOpen)
                  }
                }}
                className={cn(
                  'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                  expanded ? 'justify-start px-3' : 'justify-center',
                  activePage === 'query-library'
                    ? 'bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <BookOpen className="size-5 shrink-0" />
                <span
                  className={cn(
                    'overflow-hidden whitespace-nowrap text-left text-sm transition-[width,opacity,margin] duration-300',
                    expanded
                      ? 'ml-3 w-36 opacity-100'
                      : 'ml-0 w-0 opacity-0',
                  )}
                >
                  Guide
                </span>
                {expanded && (
                  <span className="ml-auto flex items-center justify-center opacity-60">
                    {guideOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </span>
                )}
              </button>
            </CollapsedTooltip>

            {expanded && guideOpen && (
              <div className="ml-8 mt-1 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onPageChange?.('query-library')}
                  className={cn(
                    'flex h-8 items-center gap-2 rounded-lg px-3 text-sm transition-colors text-left w-full',
                    activePage === 'query-library'
                      ? 'bg-cyan-400/10 text-cyan-300'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Library className="size-3.5 shrink-0" />
                  Query Library
                </button>
              </div>
            )}
          </div>

          {adminVisible ? (
            <div className="flex flex-col">
              <CollapsedTooltip collapsed={collapsed} label="Admin Tools">
                <button
                  type="button"
                  aria-label="Admin Tools"
                  onClick={() => {
                    if (collapsed) {
                      setExpanded(true)
                      setAdminOpen(true)
                    } else {
                      setAdminOpen(!adminOpen)
                    }
                  }}
                  className={cn(
                    'relative flex h-10 w-full shrink-0 items-center rounded-xl transition-colors',
                    expanded ? 'justify-start px-3' : 'justify-center',
                    activePage === 'audit-logs'
                      ? 'bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/25'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
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
                    Admin Tools
                  </span>
                  {expanded && (
                    <span className="ml-auto flex items-center justify-center opacity-60">
                      {adminOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </span>
                  )}
                </button>
              </CollapsedTooltip>

              {expanded && adminOpen && (
                <div className="ml-8 mt-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAuditLogs?.()
                    }}
                    className={cn(
                      'flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors text-left',
                      activePage === 'audit-logs'
                        ? 'bg-cyan-400/10 text-cyan-300'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <History className="size-3.5 shrink-0" />
                    System Audit Logs
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        import.meta.env.VITE_KEYCLOAK_ADMIN_URL ??
                          'http://localhost:8080/admin/master/console/#/soc-ai-search',
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                    className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm transition-colors text-left text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <ShieldCheck className="size-3.5 shrink-0" />
                    Keycloak Console
                  </button>
                </div>
              )}
            </div>
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
