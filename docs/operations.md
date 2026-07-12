# Operations Guide - SOC AI Search

## 1. Purpose

This document summarizes how to run, verify, seed, deploy, and troubleshoot SOC AI Search in local and VPS environments.

## 2. Local Runtime

Prerequisites:

- Docker with Compose
- PowerShell 7 or Windows PowerShell
- Java 21, only when running backend tests outside Docker
- Node.js compatible with the frontend lockfile

Start the core stack:

```powershell
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
docker compose up -d --build
```

Optional profiles:

```powershell
docker compose --profile auth up -d --build
docker compose --profile tools up -d
```

Local endpoints:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend health | `http://localhost:8081/api/v1/health/live` |
| Swagger UI | `http://localhost:8081/swagger-ui/index.html` |
| Keycloak, auth profile | `http://localhost:8082` |
| Kibana, tools profile | `http://localhost:5601` |

## 3. Elasticsearch Bootstrap and Seed Data

Create or refresh the event index mapping:

```powershell
./scripts/bootstrap-elasticsearch.ps1
```

Seed synthetic SOC events:

```powershell
./scripts/seed-events.ps1 -Count 10000
```

The seed script writes deterministic, scenario-based event data to Elasticsearch through the bulk API. The event document id and `event_id` field are aligned so event detail lookup remains stable.

## 4. Verification Commands

Backend:

```powershell
cd backend
./mvnw.cmd verify
```

Frontend:

```powershell
cd frontend
npm ci
npm test
npm run lint
npm run build
```

Compose:

```powershell
docker compose config --quiet
```

JaCoCo report:

```text
backend/target/site/jacoco/index.html
```

## 5. Production Deployment

Production runs on a DigitalOcean VPS with Docker Compose and Caddy.

Public domains:

| Domain | Purpose |
| --- | --- |
| `https://soc-ai-search.app` | Frontend |
| `https://api.soc-ai-search.app` | Backend API and Swagger UI |
| `https://auth.soc-ai-search.app` | Keycloak |

Deployment is handled by GitHub Actions:

1. CI verifies backend tests, frontend lint/test/build, and Docker Compose config.
2. CD connects to the VPS through SSH.
3. CD updates source code, rebuilds images when needed, and restarts services with Docker Compose.
4. Smoke tests check public frontend, backend health, and auth/OpenID endpoints.

If a smoke test fails, the CD job fails so the issue is visible in GitHub Actions. The deployment may already have restarted containers, so operators should check container health and logs before retrying.

## 6. Runtime Data and Volumes

Persistent data is stored in Docker volumes:

| Service | Data |
| --- | --- |
| PostgreSQL | query history, audit logs, pins, SearchPlan snapshots |
| Elasticsearch | SOC event index data |
| Keycloak | realm/users/roles/session metadata depending on configured storage |

Do not remove production volumes unless intentionally resetting the environment.

## 7. Useful Troubleshooting

Check containers:

```powershell
docker compose ps
```

Backend logs:

```powershell
docker compose logs -f backend
```

Elasticsearch health:

```powershell
Invoke-RestMethod http://localhost:9200/_cluster/health
```

OpenID configuration:

```text
https://auth.soc-ai-search.app/realms/soc-ai-search/.well-known/openid-configuration
```

Common issues:

| Symptom | Likely cause | First check |
| --- | --- | --- |
| 401 after refresh | token refresh/session issue | frontend auth state and backend JWT config |
| LLM provider unavailable | provider timeout/key/model issue | backend logs and `LLM_*` variables |
| Elasticsearch startup failure | low `vm.max_map_count` | VPS sysctl value |
| Swagger calls HTTP | OpenAPI server config/deployed version | `OpenApiConfig` and redeploy status |
| Empty dashboard card | one fixed SearchPlan failed | backend logs with `X-Request-Id` |

