# Keycloak Auth And Email Onboarding

This folder contains the local Keycloak setup for SOC AI Search.

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
- valid local redirect URIs: `http://localhost:3000/*`, `http://localhost:5173/*`
- local web origins: `http://localhost:3000`, `http://localhost:5173`
- production redirect URIs: `https://soc-ai-search.app/*`
- production web origin: `https://soc-ai-search.app`
- realm roles:
  - `SOC_VIEWER`
  - `SOC_ANALYST`
  - `SOC_ADMIN`
- public self-registration disabled
- default required actions for new users: `VERIFY_EMAIL`, `UPDATE_PASSWORD`

The import file intentionally does not contain demo users, passwords or SMTP secrets.

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

## Email Onboarding Flow

Self-registration is disabled. The intended admin-created user onboarding flow is:

```text
Admin creates user in Keycloak Admin Console
        ↓
Admin assigns role (SOC_VIEWER / SOC_ANALYST / SOC_ADMIN)
        ↓
Admin sends "Execute actions email" (Verify Email + Update Password)
        ↓
User receives email, clicks link
        ↓
User verifies email address and sets their own password
        ↓
User logs in to SOC AI Search at https://soc-ai-search.app
```

Key points:

- User never receives a fixed password from admin.
- User sets their own password via the email action link.
- Email verification is handled by Keycloak, not by backend.
- The `Back to Application` link in Keycloak redirects to the configured client redirect URI.

Without SMTP configured, admin can still create users and set temporary passwords manually from the Credentials tab in Keycloak Admin Console.

## SMTP Configuration

SMTP is required for email onboarding. Keycloak does not read SMTP settings from environment variables directly. SMTP must be configured through the Keycloak Admin Console.

### Configure SMTP In Admin Console

1. Open Keycloak Admin Console.
   - Local: `http://localhost:8082/admin`
   - Production: `https://auth.soc-ai-search.app/admin`
2. Select realm **soc-ai-search**.
3. Go to **Realm settings** → **Email** tab.
4. Fill in the SMTP settings:

| Field | Local/Dev (Mailtrap) | Production (Gmail) |
| --- | --- | --- |
| From | `no-reply@soc-ai-search.app` | `your-email@gmail.com` |
| From display name | `SOC AI Search` | `SOC AI Search` |
| Host | `sandbox.smtp.mailtrap.io` | `smtp.gmail.com` |
| Port | `587` | `587` |
| Enable StartTLS | ✅ | ✅ |
| Enable SSL | ❌ | ❌ |
| Enable authentication | ✅ | ✅ |
| Username | Mailtrap inbox username | `your-email@gmail.com` |
| Password | Mailtrap inbox password | Gmail App Password |

5. Click **Test connection** to verify.
6. Click **Save**.

### Local/Dev With Mailtrap

Mailtrap is a sandbox SMTP service that captures all outgoing emails. No real emails are sent to user inboxes. This is ideal for testing the onboarding flow locally.

1. Create a free account at [mailtrap.io](https://mailtrap.io).
2. Create an inbox (or use the default one).
3. Copy SMTP credentials from the inbox settings.
4. Configure in Keycloak Admin Console as shown above.
5. All emails sent by Keycloak will appear in the Mailtrap inbox.

### Production/Demo With Gmail App Password

For production or real demo environments:

1. Use a dedicated Gmail account (not personal).
2. Enable 2-Step Verification on the Google account.
3. Create an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
4. Do NOT use the main Gmail password. Use the generated App Password.
5. Configure in Keycloak Admin Console with the App Password.

### Environment Variables Reference

The `.env.example` file contains SMTP placeholder variables for reference:

```env
KEYCLOAK_SMTP_HOST=
KEYCLOAK_SMTP_PORT=587
KEYCLOAK_SMTP_FROM=no-reply@soc-ai-search.app
KEYCLOAK_SMTP_FROM_DISPLAY_NAME=SOC AI Search
KEYCLOAK_SMTP_USER=
KEYCLOAK_SMTP_PASSWORD=
KEYCLOAK_SMTP_AUTH=true
KEYCLOAK_SMTP_STARTTLS=true
KEYCLOAK_SMTP_SSL=false
```

These are passed to the Keycloak container via Docker Compose for reference. The actual SMTP configuration is done through the Admin Console. Never commit real SMTP credentials.

## Create Demo Users

Self-registration is disabled. For the MVP, users are created by an admin.

1. Open Keycloak Admin Console.
   - Local: `http://localhost:8082/admin`
   - Production: `https://auth.soc-ai-search.app/admin`
2. Log in with `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD`.
3. Switch from `master` to realm `soc-ai-search`.
4. Open **Users**.
5. Select **Create new user**.
6. Fill in username, email, first name and last name.
7. Set **Email verified** to OFF (Keycloak will verify through email action).
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

Role hierarchy is enforced by the backend:

```text
ROLE_SOC_ADMIN > ROLE_SOC_ANALYST
ROLE_SOC_ANALYST > ROLE_SOC_VIEWER
```

So an admin user only needs `SOC_ADMIN`; the backend will still allow analyst and viewer endpoints through hierarchy.

## Send Required Action Email

### Default Required Actions

The realm export configures these required actions as defaults for new users:

- **Verify Email** (`VERIFY_EMAIL`): enabled, default action
- **Update Password** (`UPDATE_PASSWORD`): enabled, default action
- **Update Profile** (`UPDATE_PROFILE`): enabled, not default

When `defaultAction` is true, Keycloak automatically assigns the action to every new user. Admin does not need to select them manually for each user.

### Sending The Email

After creating a user and assigning a role:

1. Open the user detail page.
2. Go to the top-right dropdown or **Required user actions** section.
3. Click **Execute actions email** (or **Send verify email** in some Keycloak versions).
4. Select the actions to include:
   - `Verify Email`
   - `Update Password`
5. Optionally set a link expiration time.
6. Click **Send email**.

The user receives an email with a link. Clicking the link takes the user to Keycloak where they can:

1. Set a new password.
2. Verify their email address.

After completing these actions, the `Back to Application` button redirects to the SOC AI Search frontend.

### Without SMTP (Local Fallback)

If SMTP is not configured, admin can set a temporary password manually:

1. Open the user detail page.
2. Go to **Credentials** tab.
3. Click **Set password**.
4. Enter a temporary password.
5. Set **Temporary** to ON (user must change on first login).
6. Click **Save**.
7. Communicate the temporary password to the user separately (not via Git).

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

## Existing VPS Keycloak Volume

If the VPS is already running Keycloak with an existing `keycloak_data` volume, changes to the realm export JSON file will **not** be applied automatically. Keycloak only imports the realm on first startup when no existing realm data is found.

### Option 1: Update Via Admin Console (Recommended)

Update settings manually through the Keycloak Admin Console on the VPS:

1. Login to `https://auth.soc-ai-search.app/admin`.
2. **Realm settings → Email**: configure SMTP as described above.
3. **Authentication → Required actions**: verify that `Verify Email` and `Update Password` are enabled and set as default.
4. **Clients → soc-ai-search-frontend**: verify redirect URIs include all required local and production URLs.

This preserves all existing users, sessions and configuration.

### Option 2: Re-Import Realm (Destructive)

If you need a clean realm from the JSON export:

```bash
cd /root/soc-ai-search
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy down
docker volume rm soc-ai-search_keycloak_data
docker compose -f docker-compose.yml -f docker-compose.deploy.yml --profile auth --profile proxy up -d --build
```

**Warning**: this deletes all users, sessions and manual configuration that were created through the Admin Console. You will need to recreate all demo users and reconfigure SMTP.

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

Backend JWT verification and frontend OIDC login are configured through the environment variables above. See `README.md` for production values.
