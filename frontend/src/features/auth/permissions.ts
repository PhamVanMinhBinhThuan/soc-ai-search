export type SocRole = 'SOC_VIEWER' | 'SOC_ANALYST' | 'SOC_ADMIN'

const roleRank: Record<SocRole, number> = {
  SOC_VIEWER: 1,
  SOC_ANALYST: 2,
  SOC_ADMIN: 3,
}

export type PermissionContext = {
  roles: readonly string[]
  loading?: boolean
}

function isSocRole(role: string): role is SocRole {
  return role === 'SOC_VIEWER' || role === 'SOC_ANALYST' || role === 'SOC_ADMIN'
}

export function highestSocRole(roles: readonly string[]): SocRole {
  return roles
    .filter(isSocRole)
    .sort((left, right) => roleRank[right] - roleRank[left])[0] ?? 'SOC_VIEWER'
}

function hasAtLeastRole(
  { roles, loading = false }: PermissionContext,
  requiredRole: SocRole,
) {
  if (loading) {
    return false
  }

  return roleRank[highestSocRole(roles)] >= roleRank[requiredRole]
}

export function canSearch(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_VIEWER')
}

export function canViewBasicEventDetail(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_VIEWER')
}

export function canViewRawLog(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}

export function canExportCsv(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}

export function canViewHistory(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}

export function canViewAuditLogs(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ADMIN')
}

export function isAdmin(context: PermissionContext) {
  return canViewAuditLogs(context)
}

export function canEditSearchPlan(context: PermissionContext) {
  return hasAtLeastRole(context, 'SOC_ANALYST')
}
