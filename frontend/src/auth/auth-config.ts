import type { AuthProviderProps } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === 'true'

function envValue(name: string, fallback: string) {
  const value = import.meta.env[name]?.trim()
  return value && value.length > 0 ? value : fallback
}

function currentOrigin() {
  return typeof window === 'undefined'
    ? 'http://localhost:3000'
    : window.location.origin
}

const origin = currentOrigin()

export const postLogoutRedirectUri = envValue(
  'VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI',
  origin,
)

export const oidcConfig: AuthProviderProps = {
  authority: envValue(
    'VITE_KEYCLOAK_AUTHORITY',
    'http://localhost:8082/realms/soc-ai-search',
  ),
  client_id: envValue(
    'VITE_KEYCLOAK_CLIENT_ID',
    'soc-ai-search-frontend',
  ),
  redirect_uri: envValue(
    'VITE_KEYCLOAK_REDIRECT_URI',
    `${origin}/auth/callback`,
  ),
  post_logout_redirect_uri: postLogoutRedirectUri,
  scope: envValue('VITE_KEYCLOAK_SCOPE', 'openid profile email'),
  response_type: 'code',
  userStore:
    typeof window === 'undefined'
      ? undefined
      : new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
  monitorSession: false,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, '/')
  },
}
