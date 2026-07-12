# SOC AI Search Frontend

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)

Frontend for SOC AI Search: a security event console with natural-language search, dashboard analytics, investigations, audit logs, query transparency, and query library workflows.

## Architecture

```text
src/app        App composition, routes, providers
src/features   Domain modules: search, dashboard, investigations, audit logs, query library, auth
src/shared     Shared UI primitives, layout, API client, helpers, common types
```

The codebase follows a feature-based structure:

- `app` wires providers, routes, and layout.
- `features/*` owns domain-specific components, hooks, services, and helpers.
- `shared/*` contains reusable primitives that must not depend on feature code.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm test -- --run
npm run build
```

## Import Rules

- App code can import from `features` and `shared`.
- Feature code can import from `shared` and from the same feature.
- Shared code must not import from `features`.
- Prefer feature public entrypoints such as `@/features/search` when importing from app-level code.

## Auth And API

Authentication uses OIDC/Keycloak. The shared API client attaches access tokens to requests and performs the existing refresh/retry flow for 401 responses.
