# Magic Link Auth

## Description

A simple and proportionate approach for the volunteer app is to use email magic links to create a normal server-side session, with the browser only holding an opaque random session ID in a secure cookie. That basic session can last longer, for example up to 72 hours around an event, so volunteers are not constantly being asked to log in again just to register, log hours or view low-risk personal information. The important point is that the cookie should not contain the email address or any trusted timing data. It should just identify the session, with all expiry and access checks enforced on the server.

More sensitive data, such as linked children’s details or fuller records, should require step-up authentication. In practice that means the server checks whether the current session has a recent enough last_fresh_auth_at timestamp, for example within the last 30 minutes. If not, the system simply emails a fresh magic link to the address already on the user’s account, and after the link is clicked the old session is replaced with a new one and the user is returned to the requested page. That gives a good balance between ease of use and security: low-friction access for routine event tasks, but fresh proof of email control before anything more sensitive.

## Example Workflow

1. User browses public site.
2. User clicks register or sign in.
3. User enters email and receives a magic link.
4. Existing user clicks link and gets a basic session or new user clicks link, completes name/consent, then gets a basic session. With a basic session, user can view public pages plus low-risk personal data such as current registrations and simple hours history.
5. If the user accesses a sensitive feature within 30 minutes of fresh auth, allow access or if the user accesses a sensitive feature after 30 minutes, send a fresh magic link to the email already on the account; after link click, rotate or refresh the session and return them to the requested feature.
6. On a new device, or after the basic session expires at 72 hours, require a new sign-in link and enter email; public browsing remains available.

## Login Flow

1. user requests login or hits a protected area
2. app shows a “check your email” state, some info if it doesn't turn up with a manual refresh
3. otherwise this original tab listens on a broadcast channel
4. email link opens a short callback page
5. callback page redeems the token, creates or refreshes the server-side session, then broadcasts success
6. original tab continues where the user expected to end up
7. callback page just says “Success — you can close this window”

## Technical Notes

- Passport just handles the email validation step.
- Store auth details in a seperate SharePoint list with Profile lookup and Hash. Date created used for auth time.
- Cookie key is random 128-bit or 256-bit token, storing only the hash in the the auth list.
- Index on hash no need to delete old entry but always check the latest hash for a given profile is used.
- Need two timescales env vars for auth 72h to cover basic access, 30min for access to linked accounts (kids etc.) or updates.
- For the "step-up" auth no need to ask for email again.
- consider a limit of say 5 email send attempts from the same email in 1h to throttle exploits or DOS attacks.

