# Auth Features

## Microsoft Authentication (Entra ID OAuth)

Trusted users (Admin, Check In, Read Only) sign in via Microsoft OAuth. Role is assigned at login:
- **Admin**: email in `ADMIN_USERS` env var
- **Check In**: Microsoft login matched to a Profile with a `User` field set
- **Read Only**: any other Microsoft login

Routes: [routes/auth/dtv.ts](../../routes/auth/dtv.ts). Session stored server-side; `dtv-auth` cookie identifies the session.

## Self-Service Login (Magic Link + Verification Code)

Volunteers sign in by email — no Microsoft account required. Access is controlled by the `Email` field on the volunteer's Profile (comma-separated list supports multiple addresses).

Two methods, both sending via Microsoft Graph Mail (`MAIL_SENDER` env var required):

- **Magic link** ([routes/auth/magic.ts](../../routes/auth/magic.ts)): 15-minute JWT link emailed to the volunteer; clicking sets the session directly
- **Verification code** ([routes/auth/verify.ts](../../routes/auth/verify.ts)): 4-digit code valid for 15 minutes; volunteer enters it on the login page

Session token: 128-bit random, SHA-256 hash stored in SharePoint Logins list. TTL controlled by `AUTH_BASIC_TTL_HOURS` (default 72h). Global send rate limit: `EMAIL_RATE_LIMIT_PER_HOUR` (default 60).

## Role-Based Permissions

Five roles in ascending trust order:

| Role | How assigned | Access |
|------|-------------|--------|
| **Public** | Unauthenticated | Limited non-privacy view |
| **Self-Service** | Profile email match (magic link) | Own profile, own entries, future session sign-up, own photo upload |
| **Read Only** | Microsoft login (no special config) | View all data, no edits |
| **Check In** | Microsoft login + Profile.User field set | Field-day ops: check-in, hours, entries, edit sessions/profiles |
| **Admin** | `ADMIN_USERS` env var | Full access |

**Trusted** = Admin + Check In + Read Only. Self-Service is explicitly not trusted — stricter than Read Only.

Backend enforcement: `requireAuth` middleware + `requireAdmin` middleware + handler-level ownership checks. Full reference: [docs/permissions.md](../permissions.md).

## Partial Public Access

These pages and endpoints are accessible without login:
- Homepage, groups listing, group detail, sessions listing, session detail
- Public session detail is served from pre-computed Stats — no entries or profiles fetched

Volunteer names, profiles, entries, and media details require authentication.

## Consent Collection

- Consent page at `/profiles/:slug/consent` — privacy (required) and photo (optional) checkboxes
- Accessible to Admin, Check In, and Self-Service (own profile only)
- Submits via `POST /api/profiles/:id/consent` — upserts both records with today's date
- Entry detail shows a consent button when the volunteer has no accepted Privacy Consent

## Planned

- Step-up authentication for sensitive data (e.g. linked child records) — design archived in `docs/legacy/magic-link-auth.md`
