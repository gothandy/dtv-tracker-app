# Auth Features

## Microsoft Authentication (Entra ID OAuth)

Microsoft sign-in is only granted when the signed-in email matches the **Profiles** list **`User`** field (case-insensitive). There is **no** “implicit read-only” Microsoft role.

Role after a successful profile link:

- **Admin**: **`User`** match **and** email listed in **`TRACKER_ADMIN_USERS`**
- **Check In**: **`User`** match and **not** in **`TRACKER_ADMIN_USERS`**

If OAuth succeeds but **no profile** has **`User`** equal to the Microsoft email, the app **destroys the session** and redirects to **`/login?reason=dtv-not-authorised`**. That is a **failed Microsoft sign-in** (access refused), not an intentional “public” session.

Operators can set **`User`** in SharePoint when the in-app profile editor is insufficient. **Admin** accounts need both **`User`** and **`TRACKER_ADMIN_USERS`**.

Routes: [backend/routes/auth/dtv.ts](../../backend/routes/auth/dtv.ts). Session stored server-side.

**Getting the right account.** Many staff are also signed in to a work Microsoft 365 account in the same browser. The sign-in request sends `domain_hint=dtv.org.uk` and, after the first successful sign-in on a device, `login_hint` with the DTV address (remembered in the `dtv-login-hint` cookie), and **no** account picker. If someone does end up in their work account, Microsoft shows its own error (typically AADSTS50020) and never returns to the tracker, so the login page tells people to use a private window with their @dtv.org.uk address.

**Errors are shown, not looped.** If Microsoft returns an error (e.g. the person cancelled), the callback sends them to `/login?reason=microsoft-error` with Microsoft's message to pass to an admin. The callback also checks the `state` it sent; a mismatch (e.g. the server restarted mid sign-in) goes to `/login?reason=microsoft-restart`.

## Self-Service Login (Verification Code)

Volunteers sign in by email — no Microsoft account required. Access is controlled by the `Email` field on the volunteer's Profile (comma-separated list supports multiple addresses).

Volunteers receive a verification code by email via Microsoft Graph Mail, from `EMAIL_FROM` in `backend/config.ts`:

- **Verification code** ([backend/routes/auth/verify.ts](../../backend/routes/auth/verify.ts)): 4-digit code valid for 15 minutes; volunteer enters it on the login page

Session token: 128-bit random, SHA-256 hash stored in SharePoint Logins list. Lifetime: `SELF_SERVICE_LOGIN_HOURS` (72h). Global send rate limit: `SIGN_IN_EMAILS_PER_HOUR` (60). Both in `backend/config.ts`.

## Role-Based Permissions

App levels (see also capability stack in [AGENTS.md](../../AGENTS.md)):

| Role | How assigned | Access |
|------|-------------|--------|
| **Public** | Unauthenticated | Limited non-privacy view |
| **Self-Service** | Profile email match (verification code) | Own profile, own entries, future session sign-up, own photo upload |
| **Check In** | Microsoft + Profile **`User`** match (not admin list) | Field-day ops: check-in, hours, entries, edit sessions/profiles |
| **Admin** | Microsoft + **`User`** match **and** **`TRACKER_ADMIN_USERS`** | Full access (includes everything Check In can do) |

**Trusted (Microsoft)** = Admin ∪ Check In. Self-Service is explicitly not trusted for other volunteers’ data.

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
