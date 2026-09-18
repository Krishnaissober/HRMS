# Optional Microsoft Graph OTP setup for Triple Minds HRMS

> Resend is the recommended production provider when Microsoft Entra credentials are unavailable. See [EMAIL-OTP-SETUP.md](./EMAIL-OTP-SETUP.md). This document covers Graph only as an optional alternative.

The HRMS already uses Better Auth's email OTP plugin and already has a Microsoft Graph mail provider. This guide only configures Microsoft Entra ID and the sender mailbox.

## What is already implemented

- Better Auth email OTP requests and password resets:
  - `POST /api/auth/email-otp/request-password-reset`
  - `POST /api/auth/email-otp/reset-password`
- Six-digit OTPs, five-minute expiry, hashed storage, five-attempt limit, resend cooldown, and session revocation after password reset.
- Microsoft Graph OAuth client-credentials token flow.
- Microsoft Graph `sendMail` through `/v1.0/users/{sender}/sendMail`.
- Branded HTML OTP email without passwords or sensitive account data.
- Generic password-reset responses so account existence is not disclosed.
- Development-only admin email test route: `POST /api/v1/dev/email-test`.

## What is still required

The code cannot send real mail until a company administrator creates and authorizes an Entra application and confirms the sender mailbox. The local project currently uses `EMAIL_PROVIDER=console` unless you change it.

## Entra ID setup

The names in the current Microsoft interface can vary slightly by tenant, but the flow is:

1. Open the [Microsoft Entra admin center](https://entra.microsoft.com/).
2. Go to **Identity > Applications > App registrations**.
3. Select **New registration**.
4. Use the name **Triple Minds HRMS OTP Mailer**.
5. For account type, select **Accounts in this organizational directory only** (single tenant).
6. Select **Register**.
7. On the app **Overview** page, copy:
   - **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`
   - **Application (client) ID** → `MICROSOFT_CLIENT_ID`
8. Open **Certificates & secrets**.
9. Select **New client secret**, enter a description such as **HRMS OTP mail**, choose an expiry allowed by company policy, and select **Add**.
10. Copy the **Value** immediately. This is the only time the full secret value is displayed. → `MICROSOFT_CLIENT_SECRET`
11. Open **API permissions**.
12. Select **Add a permission > Microsoft Graph > Application permissions**.
13. Search for and select **Mail.Send** under **Mail**.
14. Select **Add permissions**.
15. Select **Grant admin consent for Triple Minds** and confirm.

**[COMPANY ADMIN REQUIRED]** App registration, client-secret creation, adding `Mail.Send`, and granting admin consent normally require Entra administrator privileges. Do not use delegated permissions; this server integration uses application permission with the client-credentials flow.

## Sender mailbox

Use a real, approved Microsoft 365 mailbox, for example `noreply@tripleminds.co`. The mailbox must exist and the company must permit the registered application to send as that mailbox.

Set the complete mailbox address as:

```env
MICROSOFT_SENDER_EMAIL=noreply@tripleminds.co
```

Do not use a display name, personal name, alias that is not provisioned, or an address from another tenant. If the organization restricts application mail access to approved mailboxes, the company administrator must add this application/sender combination to the tenant's allowed policy.

## Message for the company administrator

> Hello, please configure a Microsoft Entra app named “Triple Minds HRMS OTP Mailer” in the Triple Minds tenant for our HRMS password-reset emails. It needs Microsoft Graph **Application permission: Mail.Send**, with admin consent granted. Please create a client secret and provide the tenant ID, client ID, and secret value through our approved secure channel. Please also confirm the approved sender mailbox (for example `noreply@tripleminds.co`) exists and that this application is allowed to send from it. No credentials should be sent in regular email or chat.

## Project configuration

Copy `.env.example` to `.env.local` if needed, then set:

```env
EMAIL_PROVIDER=graph
MICROSOFT_TENANT_ID=your-directory-tenant-id
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=the-secret-value-from-entra
MICROSOFT_SENDER_EMAIL=noreply@tripleminds.co
EMAIL_DEV_LOG_OTP=false
```

Never commit `.env` or `.env.local`. They are already ignored by `.gitignore`. Restart the local stack after changing environment variables.

## Real email test

The development test endpoint requires an authenticated local administrator or Master Admin session. It is disabled in production and does not return the test code in the API response.

```powershell
$body = @{ recipient = 'your-gmail@example.com' } | ConvertTo-Json
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/dev/email-test' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body `
  -WebSession $session
```

Run it once for a Gmail address and once for an approved `@tripleminds.co` address. Confirm the message arrives in the inbox or junk folder. A Graph HTTP `202` only means Microsoft accepted the request; it does not prove final inbox delivery.

Then test the real flow in the application:

1. Open **Forgot password**.
2. Enter a real provisioned account email.
3. Confirm the branded OTP arrives.
4. Enter the OTP before five minutes expires.
5. Set a new password.
6. Confirm the previous session is revoked when applicable.

## Troubleshooting

- **401 from the token endpoint:** tenant ID, client ID, or client secret is wrong/expired; create a new secret and use its **Value**, not its secret ID.
- **403 from `sendMail`:** `Mail.Send` is missing, admin consent was not granted, or the tenant's application-mail policy blocks this app.
- **Mailbox/user not found:** `MICROSOFT_SENDER_EMAIL` is not a real mailbox in the tenant or is misspelled.
- **Accepted by Graph but no message:** check sender mailbox permissions, tenant transport rules, quarantine, junk mail, and recipient mail flow. Test both internal and Gmail destinations.
- **No OTP in local console:** this is expected when Graph is configured. `EMAIL_DEV_LOG_OTP=true` may be used only in development/test to log OTPs; keep it `false` in production.

## Completion checklist

| Check | Current state before company setup |
| --- | --- |
| Microsoft Graph configured | No — credentials are not in the local environment |
| Sender mailbox configured | No — mailbox is not set locally |
| Graph authentication working | Not testable without credentials |
| `Mail.Send` permission working | Requires Entra admin consent |
| Admin consent granted | Must be confirmed by company admin |
| OTP actually received by Gmail | Not yet verified |
| OTP actually received by `@tripleminds.co` | Not yet verified |
| Forgot-password flow | Code path is implemented; external delivery remains unverified |

Until the two real mailbox tests pass, the correct status is: **EXTERNAL CONFIGURATION REQUIRED**.
