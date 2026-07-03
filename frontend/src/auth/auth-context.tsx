/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  AuthProvider as OidcAuthProvider,
  useAuth as useOidcAuth,
} from 'react-oidc-context'
import type { User } from 'oidc-client-ts'

import {
  authEnabled,
  oidcConfig,
  postLogoutRedirectUri,
} from '@/auth/auth-config'
import { apiUrl, errorPayload } from '@/services/api-client'

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
  refreshAccessToken: () => Promise<string | null>
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
  refreshAccessToken: async () => null,
  signIn: () => undefined,
  signOut: () => undefined,
}

const SocAuthContext = createContext<SocAuthState>(demoAuthState)

type BackendCurrentUser = {
  authenticated: boolean
  identity: string
  username: string | null
  email: string | null
  roles: string[]
}

type BackendCurrentUserState = {
  accessToken: string | null
  user: BackendCurrentUser | null
  errorMessage: string | null
}

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

function isBackendCurrentUser(value: unknown): value is BackendCurrentUser {
  return (
    isRecord(value) &&
    typeof value.authenticated === 'boolean' &&
    typeof value.identity === 'string' &&
    (typeof value.username === 'string' || value.username === null) &&
    (typeof value.email === 'string' || value.email === null) &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === 'string')
  )
}

async function fetchBackendCurrentUser(
  accessToken: string,
  signal: AbortSignal,
) {
  const response = await fetch(apiUrl('/api/v1/auth/me'), {
    signal,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    const parsed = errorPayload(payload)
    throw new Error(parsed.message)
  }

  if (!isBackendCurrentUser(payload)) {
    throw new Error('The backend returned an invalid auth/me response')
  }

  return payload
}

function OidcAuthBridge({ children }: { children: ReactNode }) {
  const oidc = useOidcAuth()
  const user = oidc.user
  const accessToken = user?.access_token ?? null
  const [backendUserState, setBackendUserState] =
    useState<BackendCurrentUserState>({
      accessToken: null,
      user: null,
      errorMessage: null,
    })

  useEffect(() => {
    if (!oidc.isAuthenticated || !accessToken) {
      return
    }

    const controller = new AbortController()

    fetchBackendCurrentUser(accessToken, controller.signal)
      .then((currentUser) => {
        if (!controller.signal.aborted) {
          setBackendUserState({
            accessToken,
            user: currentUser,
            errorMessage: null,
          })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setBackendUserState({
            accessToken,
            user: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Unable to load current user permissions',
          })
        }
      })

    return () => controller.abort()
  }, [accessToken, oidc.isAuthenticated])

  const value = useMemo<SocAuthState>(() => {
    const backendStateMatchesToken =
      backendUserState.accessToken === accessToken
    const backendUser = backendStateMatchesToken
      ? backendUserState.user
      : null
    const backendUserError = backendStateMatchesToken
      ? backendUserState.errorMessage
      : null
    const backendUserLoading = Boolean(
      oidc.isAuthenticated &&
        accessToken &&
        !backendStateMatchesToken,
    )
    const username = stringClaim(user?.profile.preferred_username)
    const email = stringClaim(user?.profile.email)
    const subject = stringClaim(user?.profile.sub)
    const name = stringClaim(user?.profile.name)
    const identity = name ?? username ?? email ?? subject ?? 'unknown-user'
    const tokenRoles = user ? rolesFromProfile(user.profile) : []

    return {
      enabled: true,
      loading:
        oidc.isLoading ||
        oidc.activeNavigator !== undefined ||
        backendUserLoading,
      authenticated: Boolean(oidc.isAuthenticated && user?.access_token),
      identity: backendUser?.identity ?? identity,
      username: backendUser?.username ?? username,
      email: backendUser?.email ?? email,
      roles: backendUser?.roles ?? tokenRoles,
      accessToken,
      errorMessage: oidc.error?.message ?? backendUserError,
      refreshAccessToken: async () => {
        const refreshedUser = await oidc.signinSilent()
        return refreshedUser?.access_token ?? oidc.user?.access_token ?? null
      },
      signIn: () => {
        void oidc.signinRedirect()
      },
      signOut: () => {
        void oidc.signoutRedirect({
          id_token_hint: user?.id_token,
          post_logout_redirect_uri: postLogoutRedirectUri,
        })
      },
    }
  }, [accessToken, backendUserState, oidc, user])

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
