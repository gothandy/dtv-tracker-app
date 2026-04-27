# Session Stats

Session stats are pre-computed JSON blobs stored on each Session list item (the `Stats` field). They allow the homepage, session lists, and stats dashboard to display counts without fetching entries on every request.

Profile Stats are a parallel system — stored on Profile items — and feed into session stats via the `new` count. Both are documented here because they interact.

---

## Session Stats JSON shape

```json
{
  "count": 12,
  "hours": 45.5,
  "new": 2,
  "child": 1,
  "regular": 8,
  "cancelledRegular": 1,
  "eventbrite": 3,
  "media": 5
}
```

### Field definitions

All counts exclude cancelled entries, except `cancelledRegular` which counts only cancelled ones.

| Field | Source | Notes |
|---|---|---|
| `count` | non-cancelled entries | all active registrations |
| `hours` | sum of non-cancelled `entry.Hours` | rounded to 1 dp |
| `new` | `profile.stats.sessionIds[0] === sessionId` AND `!Labels.includes('Regular')` | volunteer's first-ever session and not a regular |
| `child` | non-cancelled entries with `AccompanyingAdultLookupId` set | |
| `regular` | non-cancelled entries with `Labels.includes('Regular')` | |
| `cancelledRegular` | **cancelled** entries with `Labels.includes('Regular')` | used to warn when regular didn't show |
| `eventbrite` | non-cancelled entries with `EventbriteAttendeeID` set | |
| `media` | public photo/video count from SharePoint media library | not derived from entries; used by homepage carousel to find sessions with photos |

### Entry classification

Non-cancelled entries fall into three mutually exclusive categories. All are DTV-wide — not group-specific.

- **New** — volunteer's first-ever session with DTV (not just this group)
- **Regular** — has the `Regular` label on this entry (overrides New)
- **Repeat** — has attended DTV before and is not a Regular

`repeat = count - new - regular`. Repeat is **not stored** in session stats — derive it from the other three.

> Regular overrides New: a volunteer whose first-ever DTV session happens to have the Regular label counts as Regular, not New. The three categories are strictly mutually exclusive and always sum to `count`.

---

## Three update paths

Session stats are written in three different contexts. All use the same field definitions.

### 1. Per-entry targeted update

**Where:** `computeAndSaveSessionStats()` in `backend/routes/entries.ts`

**When:** Fire-and-forget after any entry write (PATCH, POST create, POST refresh, DELETE).

**How:** Fetches only that session's entries + all profiles (to build `profileFirstSessionMap` for `new` count). Reads the existing `media` count from the cached session Stats so it isn't wiped on every entry change.

### 2. Full bulk refresh

**Where:** `runSessionStatsRefresh()` in `backend/services/session-stats.ts`

**When:** `POST /sessions/refresh-stats` (admin UI) or triggered by the nightly Eventbrite sync.

**How:** Fetches all sessions, entries, groups, and profiles in one pass. Re-fetches media counts from SharePoint for each group. Skips sessions where stored stats already match to minimise Graph API writes. Clears the sessions cache after the bulk update.

### 3. Session detail live computation

**Where:** `GET /sessions/:group/:date` in `backend/routes/sessions.ts`

**When:** Every time the session detail page loads for an operational user.

**How:** Computed inline from the entries already fetched for the page response — always live, never stale. Uses the same definitions as above. **Does not write to the Stats field.**

---

## Profile Stats JSON shape

Profile Stats feed into session stats via the `new` count. They are stored on each Profile item.

```json
{
  "hoursByFY":     { "FY2025": 120.0, "FY2026": 45.5 },
  "sessionsByFY":  { "FY2025": 28, "FY2026": 12 },
  "sessionIds":    [101, 203, 305],
  "regularGroupIds":  [5, 12],
  "repeatGroupIds":   [3, 5, 7, 12],
  "linkedProfileIds": [42],
  "isMember":      true,
  "cardStatus":    "Accepted",
  "isFirstAider":  true,
  "noPhoto":       false,
  "warnings":      [{ "text": "Possible Duplicate", "url": "..." }]
}
```

| Field | Meaning |
|---|---|
| `hoursByFY` | total volunteer hours per financial year (non-cancelled entries) |
| `sessionsByFY` | session count per financial year (non-cancelled entries) |
| `sessionIds` | all attended session IDs, sorted oldest-first; `[0]` is first-ever session |
| `regularGroupIds` | group IDs where the volunteer is listed as a Regular |
| `repeatGroupIds` | group IDs where the volunteer has any non-cancelled attendance (stored; not used for per-viewer flags) |
| `linkedProfileIds` | other profile IDs sharing the same email address |
| `isMember` | has an Accepted Charity Membership record |
| `cardStatus` | Discount Card record status |
| `isFirstAider` | has a valid (not-yet-expired) First Aid Certificate record |
| `noPhoto` | no Accepted Photo Consent record |
| `warnings` | computed warnings shown on profile (Duplicate, MatchNameError, ChildNoAdult, NoConsent) |

### Profile Stats update paths

| Path | When |
|---|---|
| `computeAndSaveProfileStats()` in `entries.ts` | fire-and-forget after a PATCH (hours/checkedIn change) or entry cancel |
| `runProfileStatsRefresh()` in `profile-stats.ts` | `POST /profiles/refresh-stats` (admin) or nightly Eventbrite sync |

---

## Per-viewer personalised flags (session detail only)

The session detail response includes personalised flags for the **currently logged-in viewer**. These are not session aggregates. The New/Regular/Repeat definitions match the entry classification above — all DTV-wide, not group-specific.

| Flag | Source | Meaning |
|---|---|---|
| `isRegular` | `selfProfileStats.regularGroupIds.includes(groupId)` | viewer is on the Regulars list for this group |
| `isRepeat` | `!selfIsNew && !isRegular` | viewer has attended DTV before and is not a Regular here |
| `isRegistered` | live entry lookup | viewer has an active (non-cancelled) entry for this session |
| `isAttended` | `entry.checkedIn` | viewer was checked in (admin/checkin roles only) |

`selfIsNew` is true when the viewer has no entries in `sessionIds` at all (never attended DTV). `isRegular` uses the Regulars list, which is the source of the Regular label for future sessions.

---

## Stats dashboard (stats.ts)

The `/stats` and `/stats/history` routes read entirely from cached session and profile Stats — no entry fetching.

| Data point | Source |
|---|---|
| Session count | count of Session items in the FY |
| Hours | `session.Stats.hours` summed across sessions in the FY |
| Volunteers | profiles where `profile.Stats.sessionsByFY[fyKey] > 0` |
| Active groups | distinct group IDs across sessions in the FY |

---

## Critical files

| File | Role |
|---|---|
| `backend/services/data-layer.ts` | `calculateSessionStats()` — shared core function |
| `backend/services/session-stats.ts` | `runSessionStatsRefresh()` — bulk refresh |
| `backend/services/profile-stats.ts` | `computeAndSaveProfileStats()`, `runProfileStatsRefresh()` |
| `backend/routes/entries.ts` | `computeAndSaveSessionStats()` — per-entry targeted update |
| `backend/routes/sessions.ts` | live inline computation on session detail |
| `backend/routes/stats.ts` | stats dashboard reads from stored session/profile Stats |
| `types/api-responses.ts` | `SessionStats` interface |
