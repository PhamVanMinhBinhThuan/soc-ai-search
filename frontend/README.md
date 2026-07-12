<div align="center">

# 🖥️ SOC AI Search Frontend

Feature-based React application for SOC event search, analytics, investigations, and audit workflows.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)

</div>

## <a id="table-of-contents"></a>📚 Table of Contents

- [Responsibilities](#responsibilities)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Environment](#environment)
- [Authentication and API](#authentication-and-api)
- [Verification](#verification)
- [Related Documentation](#related-documentation)

## <a id="responsibilities"></a>🎯 Responsibilities

| Area | Frontend responsibility |
| --- | --- |
| Event Search | Capture natural-language questions and render tables, counts, bar charts, and time-series results. |
| Investigation UX | Present Query Breakdown, SearchPlan, DSL, refinement, summaries, suggestions, and event details. |
| SOC Views | Render the dashboard, personal investigations, query library, and admin audit logs. |
| Access Control | Complete the OIDC browser flow and hide actions that are unavailable for the current role. |
| API Integration | Attach access tokens, normalize API errors, coordinate one token refresh, and retry a failed request once after a 401. |

Backend authorization remains the source of truth; frontend permission checks are for navigation and user experience.

## <a id="architecture"></a>🏗️ Architecture

```text
src/
|-- app/                 Application composition, routes, providers, and shell
|-- features/            audit-logs, auth, dashboard, investigations,
|                       query-library, and search
|-- shared/
|   |-- components/      Reusable UI and display components
|   |-- lib/             Cross-feature formatting and utility functions
|   |-- services/api/    HTTP client, auth token handling, and shared API code
|   `-- types/           Shared API and UI contracts
|-- index.css            Global styles and Tailwind theme
`-- main.tsx             Browser entry point
```

The application follows these dependency boundaries:

- `app` composes feature public entry points and shared infrastructure.
- `shared` must remain independent of feature modules.
- Each feature owns its components, hooks, services, data, and local helpers.
- Cross-feature imports are limited to established integrated workflows, such as search/history and investigations/audit; reusable contracts belong in `shared`.

## <a id="quick-start"></a>🚀 Quick Start

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8081` during local development. Set `VITE_API_BASE_URL` when the API is hosted on another origin.

## <a id="scripts"></a>🧪 Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and build production assets. |
| `npm run preview` | Preview the production build. |
| `npm run lint` | Run ESLint across the frontend. |
| `npm test` | Run the Vitest suite once. |

## <a id="environment"></a>⚙️ Environment

Copy [`frontend/.env.example`](.env.example) to `.env`. The application consumes these groups:

| Group | Variables |
| --- | --- |
| API and mock mode | `VITE_API_BASE_URL`, `VITE_USE_MOCK` |
| OIDC switch | `VITE_AUTH_ENABLED` |
| Keycloak client | `VITE_KEYCLOAK_AUTHORITY`, `VITE_KEYCLOAK_CLIENT_ID`, `VITE_KEYCLOAK_SCOPE` |
| Redirects | `VITE_KEYCLOAK_REDIRECT_URI`, `VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI` |

Do not place confidential server credentials in `VITE_*` variables; Vite embeds them in browser assets.

## <a id="authentication-and-api"></a>🔐 Authentication and API

Authentication uses `react-oidc-context` and `oidc-client-ts` with Keycloak. The shared HTTP client reads the current access token, adds `Authorization: Bearer <token>`, and converts failed responses into a common `ApiError`.

When an API request returns 401, concurrent failures share one silent-refresh promise. Each original request is retried at most once with the refreshed token, avoiding duplicate refresh calls during parallel dashboard or search requests.

## <a id="verification"></a>✅ Verification

```powershell
npm ci
npm test
npm run lint
npm run build
```

## <a id="related-documentation"></a>📖 Related Documentation

- [Project overview](../README.md)
- [Backend architecture](../backend/README.md)
- [Authentication onboarding](../docs/auth-onboarding.md)
