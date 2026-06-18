/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from 'react-oidc-context'
import type { User } from 'oidc-client-ts'

import { authEnabled, oidcConfig } from '@/auth/auth-config'

export type SocAuthState = {
  enabled: boolean
  loading: boolean
  authenticated: boolean
  identity: string
  username: string | null
  email: string | null
  roles: string[]
  accessToken: string | null
  errorMessage: string | null
  signIn: () => void
  signOut: () => void
}

const demoAuthState: SocAuthState = {
  enabled: false,
  loading: false,
  authenticated: true,
  identity: 'demo-analyst',
  username: 'demo-analyst',
  email: null,
  roles: ['SOC_ANALYST'],
  accessToken: null,
  errorMessage: null,
  signIn: () => undefined,
  signOut: () => undefined,
}

const SocAuthContext = createContext<SocAuthState>(demoAuthState)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringClaim(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function rolesFromProfile(profile: User['profile']) {
  const roles = new Set<string>()

  const realmAccess = profile.realm_access
  if (isRecord(realmAccess) && Array.isArray(realmAccess.roles)) {
    realmAccess.roles
      .filter((role): role is string => typeof role === 'string')
      .forEach((role) => roles.add(role))
  }

  const resourceAccess = profile.resource_access
  if (isRecord(resourceAccess)) {
    Object.values(resourceAccess).forEach((clientAccess) => {
      if (isRecord(clientAccess) && Array.isArray(clientAccess.roles)) {
        clientAccess.roles
          .filter((role): role is string => typeof role === 'string')
          .forEach((role) => roles.add(role))
      }
    })
  }

  return [...roles].sort()
}

function OidcAuthBridge({ children }: { children: ReactNode }) {
  const oidc = useOidcAuth()
  const user = oidc.user

  const value = useMemo<SocAuthState>(() => {
    const username = stringClaim(user?.profile.preferred_username)
    const email = stringClaim(user?.profile.email)
    const subject = stringClaim(user?.profile.sub)
    const identity = username ?? email ?? subject ?? 'unknown-user'

    return {
      enabled: true,
      loading: oidc.isLoading || oidc.activeNavigator !== undefined,
      authenticated: Boolean(oidc.isAuthenticated && user?.access_token),
      identity,
      username,
      email,
      roles: user ? rolesFromProfile(user.profile) : [],
      accessToken: user?.access_token ?? null,
      errorMessage: oidc.error?.message ?? null,
      signIn: () => {
        void oidc.signinRedirect()
      },
      signOut: () => {
        void oidc.signoutRedirect()
      },
    }
  }, [oidc, user])

  return (
    <SocAuthContext.Provider value={value}>
      {children}
    </SocAuthContext.Provider>
  )
}

export function SocAuthProvider({ children }: { children: ReactNode }) {
  if (!authEnabled) {
    return (
      <SocAuthContext.Provider value={demoAuthState}>
        {children}
      </SocAuthContext.Provider>
    )
  }

  return (
    <OidcAuthProvider {...oidcConfig}>
      <OidcAuthBridge>{children}</OidcAuthBridge>
    </OidcAuthProvider>
  )
}

export function useSocAuth() {
  return useContext(SocAuthContext)
}
