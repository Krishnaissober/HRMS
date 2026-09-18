# HRMS OTP email setup

The HRMS uses one provider-agnostic email service. Better Auth owns the OTP and password-reset workflow; the provider only delivers the message.

## Recommended production provider: Resend

Resend does not require Microsoft Entra, Microsoft 365, or Outlook credentials. It can deliver to Gmail, `@tripleminds.co`, and other valid recipient addresses supported by the application.

### 1. Create a Resend account

1. Open [Resend](https://resend.com/).
2. Create or sign in to the company account.
3. Open **Domains** and select **Add Domain**.
4. Add the company sending domain, such as `tripleminds.co`.
5. Resend will show DNS records. Add the displayed SPF, DKIM, and any required return-path records to the company DNS provider.
6. Wait until Resend shows the domain as **Verified**.

For quick development testing, Resend may allow its onboarding sender, subject to current account restrictions. For production, use a sender address on a verified company domain.

### 2. Create the API key

1. Open **API Keys** in Resend.
2. Select **Create API Key**.
3. Name it **Triple Minds HRMS OTP**.
4. Give it only the sending access required by the project.
5. Copy the key once and store it in the approved secrets manager or local `.env.local` file.

### 3. Configure the HRMS

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@tripleminds.co
EMAIL_DEV_LOG_OTP=false
```

`EMAIL_FROM` must be a sender address allowed by the verified Resend domain. Do not put the API key in source code, frontend code, screenshots, regular email, or chat.

Restart the local application after changing environment variables. For deployment, set the same values in the hosting provider's encrypted production environment settings.

## Optional Microsoft Graph provider

Microsoft Graph remains available for organizations that later provide Entra credentials:

```env
EMAIL_PROVIDER=graph
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_SENDER_EMAIL=
```

These values are not required when `EMAIL_PROVIDER=resend`. The older names `microsoft-graph` and `MICROSOFT_GRAPH_SENDER_EMAIL` are still accepted for compatibility.

## Test email delivery

The development-only endpoint is protected by the existing local-admin/Master Admin authentication boundary and is disabled in production. Call it from an authenticated browser session or an HTTP client that includes that session cookie:

```powershell
$body = @{ recipient = 'your-gmail@example.com' } | ConvertTo-Json
Invoke-WebRequest `
  -Uri 'http://localhost:3000/api/v1/dev/email-test' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body `
  -WebSession $session
```

Repeat with an approved `@tripleminds.co` address. Check inbox, junk, quarantine, and the Resend delivery log. A successful Resend API response only confirms acceptance by Resend; it does not prove the recipient mailbox received the message.

## Test the real password-reset flow

1. Open **Forgot password** in the HRMS.
2. Enter a real provisioned account email.
3. Confirm the branded OTP arrives.
4. Enter the OTP within five minutes.
5. Set a new password.
6. Confirm the old session is revoked as expected.

The application keeps the existing protections: hashed OTPs, five-minute expiry, five-attempt limit, resend cooldown, rate limiting, generic account-reset responses, and reset-session revocation.

## Troubleshooting

- **401 or 403 from Resend:** the API key is missing, invalid, revoked, or lacks sending access.
- **Sender not permitted:** `EMAIL_FROM` is not on a verified Resend domain or the domain DNS verification is incomplete.
- **API accepts mail but recipient does not see it:** check Resend delivery events, bounces, blocks, spam/junk, quarantine, and recipient mail-flow rules.
- **Company domain does not receive mail:** ask the Microsoft 365 administrator to check Exchange quarantine, transport rules, and whether Resend's SPF/DKIM records are present.
- **Forgot-password response succeeds but no email arrives:** inspect the server log for `auth_otp_delivery_failed`, then check the Resend dashboard. The response remains generic intentionally so account existence is not disclosed.

## Completion checklist

| Check | Status before Resend credentials and mailbox tests |
| --- | --- |
| Provider abstraction | Implemented |
| Better Auth OTP flow | Implemented |
| Resend provider code | Implemented |
| Microsoft Graph optional provider | Implemented |
| Resend API key configured | No |
| Verified sender configured | No |
| Gmail delivery received | Not yet verified |
| `@tripleminds.co` delivery received | Not yet verified |
| Real forgot-password delivery | Not yet verified |

Until both real recipient tests pass, the correct status is **EXTERNAL CONFIGURATION REQUIRED**.
