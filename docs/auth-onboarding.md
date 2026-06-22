# 🔐 Authentication & Identity Onboarding Guide

![Keycloak](https://img.shields.io/badge/Keycloak-EE0000?style=for-the-badge&logo=keycloak&logoColor=white) ![Spring Boot](https://img.shields.io/badge/spring_boot-%236DB33F.svg?style=for-the-badge&logo=spring-boot&logoColor=white)

<details>
  <summary><b>📖 Table of Contents</b></summary>

  - [🔄 1. Identity Onboarding Workflow](#1-identity-onboarding-workflow)
  - [📋 2. Administrator Provisioning Playbook](#2-administrator-provisioning-playbook)
    - [👤 2.1. Identity Creation](#21-identity-creation)
    - [🛡️ 2.2. Role Assignment & Entitlements](#22-role-assignment-entitlements)
    - [📧 2.3. Dispatching Authentication Directives](#23-dispatching-authentication-directives)
    - [🧑‍💻 2.4. End-User Action Lifecycle](#24-end-user-action-lifecycle)
  - [📨 3. SMTP Infrastructure Providers](#3-smtp-infrastructure-providers)
    - [Provider Matrix Comparison](#provider-matrix-comparison)
  - [🆘 4. Fallback Workflow: Manual Password Provisioning](#4-fallback-workflow-manual-password-provisioning)
  - [🩺 5. Incident Troubleshooting Guide](#5-incident-troubleshooting-guide)
    - [❌ 5.1. User fails to receive the onboarding email](#51-user-fails-to-receive-the-onboarding-email)
    - [❌ 5.2. Keycloak throws an "Invalid redirect URI" error](#52-keycloak-throws-an-invalid-redirect-uri-error)
    - [❌ 5.3. User fails to authenticate post-password establishment](#53-user-fails-to-authenticate-post-password-establishment)
    - [❌ 5.4. Required actions fail to trigger for new identities](#54-required-actions-fail-to-trigger-for-new-identities)
  - [🛡️ 6. Enterprise Security Posture](#6-enterprise-security-posture)
</details>

This document delineates the standardized identity provisioning and onboarding workflow for SOC AI Search. To adhere to strict enterprise security postures, identities are centrally managed and provisioned by an Administrator; public self-registration is structurally disabled by default.

## 🔄 1. Identity Onboarding Workflow

```text
Administrator provisions identity within the Keycloak Admin Console
        ↓
Administrator populates core telemetry: username, email, first name, last name
        ↓
Administrator assigns target Realm Role: SOC_VIEWER / SOC_ANALYST / SOC_ADMIN
        ↓
Administrator dispatches an "Execute Actions Email" (Verify Email + Update Password directives)
        ↓
User receives secure cryptographic action link via Email
        ↓
User authenticates link → Establishes secure password → Verifies email address authenticity
        ↓
User successfully authenticates into the SOC AI Search Console
        ↓
Frontend Application resolves JWT claims to render Role-Appropriate UI (export, audit interfaces, etc.)
```

## 📋 2. Administrator Provisioning Playbook

### 👤 2.1. Identity Creation

1. Access the Keycloak Administrative Console:
   - **Local Environment:** `http://localhost:8082/admin`
   - **Production Environment:** `https://auth.soc-ai-search.app/admin`
2. Select the designated target realm: **soc-ai-search** (located in the top-left navigational dropdown).
3. Navigate to **Users** → **Create new user**.
4. Populate the Identity attributes:
   - **Username**: Standardized nomenclature (e.g., `new.analyst`).
   - **Email**: The user's corporate email address (or Mailtrap sink address for testing).
   - **First name** and **Last name**.
   - **Email verified**: Ensure this toggle is **OFF** (verification will be handled asynchronously via the email action directive).
5. Click **Create** to persist the identity.

### 🛡️ 2.2. Role Assignment & Entitlements

1. Access the newly created user's identity detail panel.
2. Navigate to the **Role mapping** tab.
3. Select **Assign role**.
4. Filter by available **realm roles**.
5. Assign the corresponding enterprise role:

| Authorized Role | Entitlement Capabilities |
| --- | --- |
| `SOC_VIEWER` | Read-only access to dashboard, search operations, event drilldowns, and personal query histories. |
| `SOC_ANALYST` | Inherits all Viewer capabilities + Authorized to execute CSV Data Exports. |
| `SOC_ADMIN` | Inherits all Analyst capabilities + Authorized to inspect System Audit Logs and manage Keycloak Identity lifecycles. |

6. Click **Assign** to bind the entitlement.

### 📧 2.3. Dispatching Authentication Directives

1. Within the user detail panel, locate the **Execute actions email** mechanism (accessible via button or dropdown).
2. Select the mandatory security actions:
   - **Verify Email**
   - **Update Password**
3. Optionally constrain the cryptographic link expiration threshold (industry standard default is 12 hours).
4. Click **Send email**.

*Operational Note:* The realm architecture is pre-configured with `VERIFY_EMAIL` and `UPDATE_PASSWORD` as baseline Required Actions. Newly provisioned identities will inherit these mandates automatically.

### 🧑‍💻 2.4. End-User Action Lifecycle

The end-user will receive a standardized email originating from the configured SMTP sender (e.g., `no-reply@soc-ai-search.app`). This email contains an ephemeral cryptographic link redirecting the user to the Keycloak IdP, where they must:

1. 🔑 Establish a new password strictly adhering to the realm's enforced password complexity policy.
2. 📩 Verify ownership of the associated email address.

Upon successful completion of these directives, Keycloak exposes a `Back to Application` redirect, seamlessly bridging the user into the SOC AI Search frontend application.

## 📨 3. SMTP Infrastructure Providers

SMTP integration is centrally managed within the Keycloak Admin Console via **Realm settings → Email**. For extensive setup topologies, refer to `infra/keycloak/README.md`.

### Provider Matrix Comparison

| Service Provider | Targeted Use Case | Cost Architecture | Implementation Profile |
| --- | --- | --- | --- |
| **Mailtrap** | Localized Development & Integration Testing | Free tier available | Virtualized sandbox inbox; prevents accidental external email dispatch. |
| **Brevo** | Production Demonstrations | Free tier (300 emails/day) | Requires account registration and standard SMTP configurations. |
| **Amazon SES** | Enterprise Production at Scale | Consumption-based pricing | Requires AWS infrastructure presence and stringent domain verification. |
| **SendGrid** | Enterprise Production at Scale | Free tier (100 emails/day) | Requires account registration and stringent domain verification. |

*Recommendation:* For this MVP cycle, Mailtrap is strongly recommended for local workflows, whereas Brevo is suitable for production demonstrations.

## 🆘 4. Fallback Workflow: Manual Password Provisioning

In operational scenarios where SMTP infrastructure is unavailable or deliberately isolated:

1. Create the user identity as outlined in Section 2.1.
2. Navigate to the **Credentials** tab.
3. Select **Set password**.
4. Input a robust temporary password.
5. Ensure the **Temporary** toggle is set to **ON** (forcing a password rotation upon initial login).
6. Click **Save**.
7. Transmit the temporary password to the end-user via an encrypted, out-of-band communication channel. *Never commit credentials to version control.*

## 🩺 5. Incident Troubleshooting Guide

### ❌ 5.1. User fails to receive the onboarding email

- 🔍 Verify SMTP configurations within **Realm settings → Email**.
- 🛠️ Execute the **Test connection** utility to validate SMTP credential integrity.
- 📬 If utilizing Mailtrap, physically inspect the Mailtrap sandbox inbox (emails are intercepted, not forwarded).
- 📋 Inspect Keycloak container logs for underlying SMTP transmission errors:

```bash
docker compose --profile auth logs keycloak | grep -i smtp
```

### ❌ 5.2. Keycloak throws an "Invalid redirect URI" error

- 🔗 Validate that the target client `soc-ai-search-frontend` possesses the correct authorized redirect URIs.
- 🌐 For production environments, rigorously ensure `https://soc-ai-search.app/*` is explicitly whitelisted.
- 🔍 Inspect the **post.logout.redirect.uris** parameters within the client attributes.

### ❌ 5.3. User fails to authenticate post-password establishment

- 👁️ Audit the user's **Email verified** boolean status within the Admin Console.
- 🛡️ Verify the identity has been explicitly mapped to an authorized realm role.
- 🔑 Confirm that the frontend application's `VITE_KEYCLOAK_AUTHORITY` variable symmetrically matches the actual Keycloak issuer URI.

### ❌ 5.4. Required actions fail to trigger for new identities

- ⚙️ Navigate to **Authentication → Required actions** within the Admin Console.
- ✅ Verify that `Verify Email` and `Update Password` are toggled as Enabled and designated as Default Actions.
- 🔄 If the realm configuration was imported prior to the `requiredActions` schema update, manually enable the directives.

## 🛡️ 6. Enterprise Security Posture

- 🚫 **Absolute Prohibition:** Never commit SMTP passwords, application passwords, or Identity credentials into the Git repository.
- 🔏 Demonstration credentials must be communicated asynchronously via isolated channels to reviewing stakeholders.
- 📝 The `infra/.env.example` file is strictly designed to contain non-functional placeholder values.
- 💾 The SMTP password supplied to the Keycloak Admin Console is persistently encrypted and stored within the `keycloak_data` Docker volume.
- 📧 Production-grade SMTP deployments must utilize dedicated service accounts, strictly prohibiting the use of personal email addresses.
