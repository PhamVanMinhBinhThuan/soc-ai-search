# Auth Onboarding Guide

This document describes the user onboarding flow for SOC AI Search. Users are created by an admin; there is no public self-registration.

## Onboarding Flow

```text
Admin creates user in Keycloak Admin Console
        ↓
Admin fills: username, email, first name, last name
        ↓
Admin assigns realm role: SOC_VIEWER / SOC_ANALYST / SOC_ADMIN
        ↓
Admin sends "Execute actions email" (Verify Email + Update Password)
        ↓
User receives email with action link
        ↓
User clicks link → sets password → verifies email
        ↓
User logs in to SOC AI Search
        ↓
Frontend shows role-appropriate UI (export, audit, etc.)
```

## Admin Step-By-Step

### 1. Create User

1. Open Keycloak Admin Console:
   - Local: `http://localhost:8082/admin`
   - Production: `https://auth.soc-ai-search.app/admin`
2. Select realm **soc-ai-search** (top-left dropdown).
3. Navigate to **Users** → **Create new user**.
4. Fill in:
   - **Username**: e.g. `new.analyst`
   - **Email**: user's real email or Mailtrap test address
   - **First name** and **Last name**
   - **Email verified**: OFF (will be verified through email action)
5. Click **Create**.

### 2. Assign Role

1. Open the newly created user's detail page.
2. Go to **Role mapping** tab.
3. Click **Assign role**.
4. Filter by **realm roles**.
5. Select the appropriate role:

| Role | Capabilities |
| --- | --- |
| `SOC_VIEWER` | View dashboard, search, event details, own history |
| `SOC_ANALYST` | All viewer capabilities + CSV export |
| `SOC_ADMIN` | All analyst capabilities + audit logs + Keycloak user management |

6. Click **Assign**.

### 3. Send Email

1. On the user detail page, find the **Execute actions email** button (or dropdown).
2. Select actions:
   - **Verify Email**
   - **Update Password**
3. Optionally adjust the link expiration (default is usually 12 hours).
4. Click **Send email**.

The realm is configured with `VERIFY_EMAIL` and `UPDATE_PASSWORD` as default required actions. New users will have these actions automatically assigned.

### 4. User Completes Onboarding

The user receives an email from the configured SMTP sender (e.g. `no-reply@soc-ai-search.app`). The email contains a link that takes the user to Keycloak where they:

1. Set a new password (meets Keycloak password policy).
2. Verify their email address.

After completing these actions, Keycloak shows a `Back to Application` link that redirects to the SOC AI Search frontend.

## SMTP Providers

SMTP is configured in Keycloak Admin Console under **Realm settings → Email**. See `infra/keycloak/README.md` for detailed setup instructions.

### Comparison

| Provider | Use Case | Cost | Setup |
| --- | --- | --- | --- |
| Mailtrap | Local development and testing | Free tier available | Sandbox inbox, no real emails sent |
| Brevo | Production demo | Free tier (300/day) | Requires account + SMTP setup |
| Amazon SES | Production at scale | Pay per email | Requires AWS account + domain verification |
| SendGrid | Production at scale | Free tier (100/day) | Requires account + domain verification |

For this MVP, Mailtrap (local) and Brevo (production) are recommended.

## Without SMTP (Manual Password)

If SMTP is not configured or not available:

1. Create the user as described above.
2. Go to the **Credentials** tab.
3. Click **Set password**.
4. Enter a temporary password.
5. Set **Temporary** to ON.
6. Click **Save**.
7. Communicate the temporary password to the user through a secure channel (not Git).

The user will be prompted to change the password on first login.

## Troubleshooting

### User does not receive email

- Verify SMTP is configured in **Realm settings → Email**.
- Click **Test connection** to check SMTP credentials.
- If using Mailtrap, check the Mailtrap inbox (emails are captured, not forwarded).
- Check Keycloak container logs for SMTP errors:

```bash
docker compose --profile auth logs keycloak | grep -i smtp
```

### "Invalid redirect URI" after email action

- Verify the client `soc-ai-search-frontend` has the correct redirect URIs.
- For production, ensure `https://soc-ai-search.app/*` is in redirect URIs.
- Check **post.logout.redirect.uris** in client attributes.

### User cannot log in after setting password

- Check the user's **Email verified** status in Admin Console.
- Verify the user has a realm role assigned.
- Check that the frontend `VITE_KEYCLOAK_AUTHORITY` matches the Keycloak issuer.

### Required actions not showing for new users

- Go to **Authentication → Required actions** in Admin Console.
- Verify `Verify Email` and `Update Password` are enabled and set as default.
- If the realm was imported before the `requiredActions` update, enable them manually.

## Security Notes

- Never commit SMTP passwords, app passwords, or user credentials to Git.
- Demo credentials are communicated separately to reviewers.
- The `.env.example` file contains only placeholder values.
- SMTP password in Keycloak Admin Console is stored in the `keycloak_data` Docker volume.
- Production SMTP should use a dedicated email account, not a personal one.
