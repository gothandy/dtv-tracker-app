# Smoke Test — Quick Release Check (~10 min)

A fast human-run sanity check after any non-trivial change. Not a substitute for the [full regression](full-regression.md) — use that for auth changes, schema changes, or major refactors.

**Pre-conditions:** `npm run dev` running at http://localhost:3000, or target the production URL. Admin credentials available.

---

## 1. Public access (1 min)

- [ ] Visit `/` — dashboard stats cards visible, no login redirect
- [ ] Visit `/sessions.html` — session list loads without error
- [ ] `GET /api/health` returns `{ success: true }` (can check in browser or DevTools Network tab)

## 2. Admin login (1 min)

- [ ] Click "Log in" → Microsoft login → redirected back to `/`
- [ ] Header shows your username and a Logout link
- [ ] `GET /auth/me` returns `{ role: "admin" }` (check in Network tab or open in browser tab)

## 3. Dashboard stats (1 min)

- [ ] This FY stats are non-zero (sessions, hours, volunteers shown in nav cards)
- [ ] Toggle to "Last FY" — values change and the bar chart updates
- [ ] Word cloud renders (if sessions have taxonomy tags)

## 4. Session list + session detail (2 min)

- [ ] Sessions page loads; cards show group name, date, stats
- [ ] Open a recent past session → entries load with badges (booking, consent, member icons)
- [ ] Stats header shows correct registrations and hours count

## 5. One reversible write (2 min)

- [ ] On the session detail, toggle one entry's check-in checkbox → green flash confirms save
- [ ] Reload the page → checkbox state persists
- [ ] Toggle it back → confirmed reverted on reload

## 6. Volunteer search + profile (1 min)

- [ ] Go to Volunteers → type 3+ chars of a known volunteer's name → result appears
- [ ] Click through to profile → hours by FY and records pills visible

## 7. Eventbrite connectivity (30 sec)

- [ ] Admin page → click "Unmatched Events" → `GET /api/eventbrite/unmatched-events` responds (even if list is empty — any non-error response confirms Eventbrite auth is live)

## 8. Cache clear (30 sec)

- [ ] Admin page → click "Refresh" → `POST /api/cache/clear` → success message shown

## 9. Automated tests (2 min)

- [ ] Run `npm run test:live` — all test files pass (auth, records, data contracts, Eventbrite, media/taxonomy)
- [ ] Run `npx vitest run` — all Vitest unit tests pass

---

## Escalate to full regression if:

- Any auth step fails or role is wrong
- Dashboard stats are zero when they shouldn't be
- A SharePoint read or write returns an unexpected error
- Any `npm test:live` test file fails (especially Eventbrite or media sections)
- You've changed auth flow, permissions, SharePoint schema, or a major backend service
