# Keycloak Local Auth Foundation

This folder contains the local Keycloak setup for SOC AI Search Day 8.

The MVP uses Keycloak as the identity provider. The application does not store users in PostgreSQL. PostgreSQL only stores the authenticated identity in search history and audit records after backend auth integration is enabled.

## Local Services

Keycloak is defined in `docker-compose.yml` under the `auth` profile:

```powershell
docker compose --profile auth up -d keycloak
```

Local URLs:

- Admin Console: `http://localhost:8082/admin`
- Realm issuer: `http://localhost:8082/realms/soc-ai-search`
- OpenID configuration: `http://localhost:8082/realms/soc-ai-search/.well-known/openid-configuration`

Local admin credentials are read from `.env`:

```env
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=change-me-keycloak
```

Use a stronger password outside local development. Do not commit real credentials.

## Realm Auto Import

Docker Compose mounts:

```text
keycloak_data -> /opt/keycloak/data
infra/keycloak/realm-export -> /opt/keycloak/data/import
```

Keycloak starts with:

```text
start-dev --import-realm
```

This imports the local realm file:

```text
infra/keycloak/realm-export/soc-ai-search-realm.json
```

The import defines:

- realm: `soc-ai-search`
- public SPA client: `soc-ai-search-frontend`
- valid local redirect URI: `http://localhost:3000/*`
- local web origin: `http://localhost:3000`
- realm roles:
  - `SOC_VIEWER`
  - `SOC_ANALYST`
  - `SOC_ADMIN`
- public self-registration disabled

The import file intentionally does not contain demo users or passwords.

`keycloak_data` persists local Keycloak data across normal `docker compose down`.
If you intentionally want a clean reset and re-import from the JSON file, run:

```powershell
docker compose --profile auth down -v
docker compose --profile auth up -d keycloak
```

## Export Realm After Manual Changes

If you change the realm manually in the Admin Console and want to keep it, export the realm and replace the file in `infra/keycloak/realm-export/`.

One simple local workflow:

```powershell
docker compose --profile auth exec keycloak /opt/keycloak/bin/kc.sh export `
  --realm soc-ai-search `
  --dir /opt/keycloak/data/import `
  --users skip
```

Then inspect the exported JSON before committing it. Do not commit users, passwords, SMTP secrets, client secrets or production URLs.

## Create Demo Users

Self-registration is disabled. For the MVP, users are created by an admin.

1. Open `http://localhost:8082/admin`.
2. Log in with `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD`.
3. Switch from `master` to realm `soc-ai-search`.
4. Open **Users**.
5. Select **Create new user**.
6. Fill in username, email, first name and last name.
7. Set **Email verified** only if you do not want to test email verification.
8. Save.

Suggested local users:

| User | Role |
| --- | --- |
| `viewer.demo` | `SOC_VIEWER` |
| `analyst.demo` | `SOC_ANALYST` |
| `admin.demo` | `SOC_ADMIN` |

## Assign Roles

1. Open the user detail page.
2. Open **Role mapping**.
3. Select **Assign role**.
4. Filter by realm roles.
5. Assign one of:
   - `SOC_VIEWER`
   - `SOC_ANALYST`
   - `SOC_ADMIN`

Day 8 only prepares auth foundation. Fine-grained RBAC behavior is implemented on Day 9.

Day 9 RBAC expects the access token to contain realm roles under:

```json
{
  "realm_access": {
    "roles": ["SOC_ANALYST"]
  }
}
```

Backend maps these roles to Spring authorities:

```text
SOC_VIEWER  -> ROLE_SOC_VIEWER
SOC_ANALYST -> ROLE_SOC_ANALYST
SOC_ADMIN   -> ROLE_SOC_ADMIN
```

Role hierarchy is enforced by the backend:

```text
ROLE_SOC_ADMIN > ROLE_SOC_ANALYST
ROLE_SOC_ANALYST > ROLE_SOC_VIEWER
```

So an admin user only needs `SOC_ADMIN`; the backend will still allow analyst
and viewer endpoints through hierarchy.

## Verify Token Role Claims

After logging in through the frontend, inspect the access token:

1. Open browser DevTools.
2. Go to **Application -> Session Storage**.
3. Find the key similar to
   `oidc.user:http://localhost:8082/realms/soc-ai-search:soc-ai-search-frontend`.
4. Copy `access_token`.
5. Decode it with a local JWT viewer or paste only into a trusted local tool.
6. Confirm `realm_access.roles` contains one of:
   - `SOC_VIEWER`
   - `SOC_ANALYST`
   - `SOC_ADMIN`

Do not commit tokens. Do not paste production tokens into public websites.

If `/api/v1/auth/me` returns an empty role list, check:

- the role is assigned as a realm role, not only a client role;
- the user logged out and logged in again after role changes;
- frontend uses realm `soc-ai-search`;
- backend `KEYCLOAK_ISSUER_URI` matches the token issuer.

## Send Required Action Email

The intended enterprise flow is:

1. Admin creates the user.
2. Admin assigns the SOC role.
3. Admin sends required actions email:
   - `VERIFY_EMAIL`
   - `UPDATE_PASSWORD`
4. The user verifies email and sets a password through the email link.

To send the email from Keycloak:

1. Configure SMTP in **Realm settings -> Email**.
2. Open the user detail page.
3. Use **Execute actions email**.
4. Select:
   - `Verify Email`
   - `Update Password`
5. Send the email.

Without SMTP, local development can set a temporary password manually from the **Credentials** tab.

## Application Config

Backend placeholders:

```env
APP_AUTH_ENABLED=false
KEYCLOAK_ISSUER_URI=http://localhost:8082/realms/soc-ai-search
```

Frontend placeholders:

```env
VITE_AUTH_ENABLED=false
VITE_KEYCLOAK_AUTHORITY=http://localhost:8082/realms/soc-ai-search
VITE_KEYCLOAK_CLIENT_ID=soc-ai-search-frontend
VITE_KEYCLOAK_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
VITE_KEYCLOAK_SCOPE=openid profile email
```

Prompt 1 only prepares infrastructure and documentation. Backend JWT verification and frontend OIDC login are implemented in later Day 8 prompts.
