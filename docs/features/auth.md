# Auth Features

## Microsoft Authentication (Entra ID OAuth)

Microsoft sign-in is only granted when the signed-in email matches the **Profiles** list **`User`** field (case-insensitive). There is **no** “implicit read-only” Microsoft role.

Role after a successful profile link:

- **Admin**: **`User`** match **and** email listed in **`ADMIN_USERS`**
- **Check In**: **`User`** match and **not** in **`ADMIN_USERS`**

If OAuth succeeds but **no profile** has **`User`** equal to the Microsoft email, the app **destroys the session** and redirects to **`/login?reason=dtv-not-authorised`**. That is a **failed Microsoft sign-in** (access refused), not an intentional “public” session.

Operators can set **`User`** in SharePoint when the in-app profile editor is insufficient. **Admin** accounts need both **`User`** and **`ADMIN_USERS`**.

Routes: [backend/routes/auth/dtv.ts](../../backend/routes/auth/dtv.ts). Session stored server-side; `dtv-auth` cookie identifies the session.

## Self-Service Login (Magic Link + Verification Code)

Volunteers sign in by email — no Microsoft account required. Access is controlled by the `Email` field on the volunteer's Profile (comma-separated list supports multiple addresses).

Two methods, both sending via Microsoft Graph Mail (`MAIL_SENDER` env var required):

- **Magic link** ([backend/routes/auth/magic.ts](../../backend/routes/auth/magic.ts)): 15-minute JWT link emailed to the volunteer; clicking sets the session directly
- **Verification code** ([backend/routes/auth/verify.ts](../../backend/routes/auth/verify.ts)): 4-digit code valid for 15 minutes; volunteer enters it on the login page

Session token: 128-bit random, SHA-256 hash stored in SharePoint Logins list. TTL controlled by `AUTH_BASIC_TTL_HOURS` (default 72h). Global send rate limit: `EMAIL_RATE_LIMIT_PER_HOUR` (default 60).

## Role-Based Permissions

App levels (see also capability stack in [AGENTS.md](../../AGENTS.md)):

| Role | How assigned | Access |
|------|-------------|--------|
| **Public** | Unauthenticated | Limited non-privacy view |
| **Self-Service** | Profile email match (magic link) | Own profile, own entries, future session sign-up, own photo upload |
| **Check In** | Microsoft + Profile **`User`** match (not admin list) | Field-day ops: check-in, hours, entries, edit sessions/profiles |
| **Admin** | Microsoft + **`User`** match **and** **`ADMIN_USERS`** | Full access (includes everything Check In can do) |

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
