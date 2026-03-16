# Session Photo Upload

Design document for collecting and displaying photos taken at volunteer events.

---

## Overview

Photos are taken at sessions by volunteers and trusted users on their phones. The feature needs to make uploading as frictionless as possible in a field setting, and store photos in a human-readable structure directly in SharePoint.

---

## Storage: SharePoint Document Library

Media files live in a dedicated SharePoint **Media Library** (document library called "Media"), separate from the SharePoint lists used for data. Access via the same Graph API client already in place — the Graph API surfaces document libraries as Drives. Covers both photos and videos.

### Folder Structure

```
Media/
└── {Group Key}/
    └── {YYYY-MM-DD}/
        ├── 143022-a3f4.jpg
        └── 143055-c91b.jpg
```

Path is derived from the session's `Group.Title` (key) and `Date` fields — no extra metadata needed.

Examples:
- `Sat/2026-02-22/`
- `RC/2026-02-22/`

**ISO date format** (`YYYY-MM-DD`) keeps folders sorted correctly and is unambiguous. The structure is browsable directly in SharePoint without the app.

### Photo Naming

Filename format: `{HHMMSS}-{4-char-random}.{ext}` — e.g. `143022-a3f4.jpg`

- **Server-assigned** at upload time (not the phone's original filename, which will often be `image.jpg` or collide across devices)
- **Time-sortable** within the day folder
- **Collision-safe** — the random suffix handles the edge case of two uploads in the same second
- **Extension preserved** from the original file (jpg, heic, png, etc.)

---

## Upload Methods

### Method 1: Volunteer Upload Link

The primary upload path. A logged-in admin or check-in user opens an entry detail page and clicks **Upload**. A 4-letter code is generated and the user is navigated directly to the upload page at `/upload/{CODE}`.

**Flow:**
1. Admin/Check In opens an entry detail page and clicks **Upload** (check-in visible)
2. `POST /api/entries/:id/upload-code` generates a code; the response includes the full URL
3. Browser navigates directly to `/upload/{CODE}` — no intermediate step
4. Upload page validates the code, shows volunteer name and session
5. For recent sessions (≤ 7 days old): a share icon lets the user share the URL via the native share sheet or copy to clipboard — so they can pass the link to the volunteer via WhatsApp/text
6. Volunteer (or trusted user) selects photos and uploads — files land in `{groupKey}/{date}/`

**Code design:**
- 4 random uppercase letters — 26⁴ = 456,976 combinations; negligible guessing risk with ≤20 active codes
- Persisted in the `Code` field on the Entries SharePoint list — survive server restarts, reusable for the same entry
- Expiry is computed at validation time: session date + 7 days (public/volunteer access only)
- Authenticated users (admin/check-in) bypass the 7-day expiry — they can upload to any session regardless of age
- The share icon on the upload page is hidden for sessions older than 7 days (sharing an expired link is pointless)

**Files:**
- `routes/upload.ts` — `POST /api/upload/validate` and `POST /api/upload/files` (public, mounted before `requireAuth`)
- `routes/entries.ts` — `POST /api/entries/:id/upload-code` (check-in+, generates and returns code + URL)
- `public/upload.html` — standalone public upload page (no auth required)
- `public/entry-detail.html` — Upload button (check-in+); click generates code and navigates directly

### Method 2: PWA Share Target (Not yet implemented)

Register the app as a share target in `site.webmanifest`. Users take photos in their native camera app, tap **Share**, and select "DTV Tracker" from the share sheet.

```json
"share_target": {
  "action": "/share-target.html",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "files": [{ "name": "photos", "accept": ["image/*"] }]
  }
}
```

A new `/share-target.html` page receives the shared image(s) and shows **today's sessions** for the user to pick from. Since there are typically 2–3 sessions on any given day this is a low-friction step.

**Only works when installed as a PWA** (Add to Home Screen). The existing `site.webmanifest` makes this straightforward to add.

---

## API Endpoints

### Authenticated (Check In + Admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/entries/:id/upload-code` | Generate a 4-letter upload code; returns `{ code, url }` |
| `GET` | `/api/media` | List media files in a session folder — `?groupKey=&date=` |
| `GET` | `/api/media/counts` | Batch photo counts by session folder — `?paths=gk/date,...` |

### Public (No authentication required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload/validate` | Validate a code; returns session/profile context. Expiry bypassed for authenticated sessions. |
| `POST` | `/api/upload/files` | Upload photos using a valid code (multipart/form-data, `code` + `photos` fields) |

### Folder Path Construction

```typescript
function sessionMediaPath(session: SessionResponse): string {
  const date = new Date(session.date);
  const isoDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${session.groupKey}/${isoDate}`;
  // e.g. Sat/2026-02-22 or RC/2026-02-22
}
```

### Graph API Operations

- **Upload**: `PUT /drives/{driveId}/root:/{path}/{filename}:/content` — Graph auto-creates intermediate folders
- **List**: `GET /drives/{driveId}/root:/{path}:/children`
- **Thumbnails**: `GET /drives/{driveId}/items/{itemId}/thumbnails` — Graph generates these natively for images

For files under ~4 MB (after client-side resize), the simple PUT upload is sufficient. No upload session needed.

### Configuration

```
MEDIA_LIBRARY_DRIVE_ID=   # Graph API Drive ID of the Media document library (not a GUID)
```

---

## Frontend

### Session Detail Page

A **Photos** carousel below the session title shows thumbnails for any photos in the session's folder. Tap a thumbnail to open the lightbox viewer.

The upload button has been moved to the **entry detail page** — trusted users navigate there for the specific volunteer and click Upload. This keeps session-detail lightweight and avoids a multi-step "generate → share → wait" flow. Photos taken by any volunteer or trusted user for the same session all land in the same folder.

### Upload Page (`/upload/:code`)

- No manual code entry — the code must be present in the URL. Navigating to `/upload` with no code shows an error.
- After successful validation: shows volunteer name, session name, and (for recent sessions) a share icon
- Share icon: uses `navigator.share` (native share sheet on mobile) or falls back to clipboard copy
- Share icon hidden if session is older than 7 days (the public expiry would reject the link anyway)
- File zone with drag-and-drop + file picker (up to 10 files, 10 MB each)
- Per-file upload progress; done screen with count after completion

### Entry Detail Page

- **Upload button** (check-in+): cloud-upload SVG icon + "Upload" label; visible to Admin and Check In roles
- Click: calls `POST /api/entries/:id/upload-code`, then navigates directly to the returned URL
- Works for sessions of any age — authenticated users bypass the 7-day public expiry

---

## Setup (One-Time)

1. Create the **"Media"** document library in the SharePoint Tracker site ✓ (already done)
2. Find the library's Drive ID — use "Discover Drives" on the admin page, or call `GET /api/photos/drives`
3. Add `MEDIA_LIBRARY_DRIVE_ID` to env vars (local `.env` and Azure App Service config)

---

## Out of Scope

- Automatic photo tagging or facial recognition
- Video uploads
- Public-facing photo gallery
- Compression beyond what Canvas resize provides

---

*Created: 2026-02-22 | Last Updated: 2026-03-01*
