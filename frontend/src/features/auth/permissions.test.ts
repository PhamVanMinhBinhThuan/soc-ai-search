import { describe, expect, it } from 'vitest'

import {
  canExportCsv,
  canSearch,
  canViewAuditLogs,
  canViewHistory,
  canViewRawLog,
  highestSocRole,
  isAdmin,
} from '@/features/auth/permissions'

describe('frontend RBAC permissions', () => {
  it('keeps viewer at basic search permission only', () => {
    const viewer = { roles: ['SOC_VIEWER'] }

    expect(canSearch(viewer)).toBe(true)
    expect(canViewRawLog(viewer)).toBe(false)
    expect(canExportCsv(viewer)).toBe(false)
    expect(canViewHistory(viewer)).toBe(false)
    expect(canViewAuditLogs(viewer)).toBe(false)
  })

  it('allows analyst to view raw logs, export CSV, and history', () => {
    const analyst = { roles: ['SOC_ANALYST'] }

    expect(canSearch(analyst)).toBe(true)
    expect(canViewRawLog(analyst)).toBe(true)
    expect(canExportCsv(analyst)).toBe(true)
    expect(canViewHistory(analyst)).toBe(true)
    expect(canViewAuditLogs(analyst)).toBe(false)
  })

  it('lets admin inherit analyst and viewer permissions', () => {
    const admin = { roles: ['SOC_ADMIN'] }

    expect(highestSocRole(['SOC_VIEWER', 'SOC_ADMIN'])).toBe('SOC_ADMIN')
    expect(canSearch(admin)).toBe(true)
    expect(canViewRawLog(admin)).toBe(true)
    expect(canExportCsv(admin)).toBe(true)
    expect(canViewHistory(admin)).toBe(true)
    expect(canViewAuditLogs(admin)).toBe(true)
    expect(isAdmin(admin)).toBe(true)
  })

  it('does not grant analyst/admin permissions from invalid roles', () => {
    const invalid = { roles: ['offline_access', 'uma_authorization'] }

    expect(highestSocRole(invalid.roles)).toBe('SOC_VIEWER')
    expect(canSearch(invalid)).toBe(true)
    expect(canExportCsv(invalid)).toBe(false)
    expect(isAdmin(invalid)).toBe(false)
  })

  it('does not evaluate sensitive permissions while auth is loading', () => {
    const loadingAdmin = { roles: ['SOC_ADMIN'], loading: true }

    expect(canSearch(loadingAdmin)).toBe(false)
    expect(canViewRawLog(loadingAdmin)).toBe(false)
    expect(canExportCsv(loadingAdmin)).toBe(false)
    expect(canViewHistory(loadingAdmin)).toBe(false)
    expect(canViewAuditLogs(loadingAdmin)).toBe(false)
  })
})
