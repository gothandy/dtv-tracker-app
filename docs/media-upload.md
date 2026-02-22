# Session Photo Upload

Design document for collecting and displaying photos taken at volunteer events.

---

## Overview

Photos are taken at sessions by volunteers and staff on their phones. The feature needs to make uploading as frictionless as possible in a field setting, and store photos in a human-readable structure directly in SharePoint.

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

### Method 1: Session Detail Page

A photo upload section on the session detail page. Two buttons for different workflows:

- **"Take photo"** — `<input type="file" accept="image/*" capture="environment">` — opens camera directly (back-facing)
- **"Upload from gallery"** — `<input type="file" accept="image/*" multiple>` — opens camera roll, allows selecting multiple

After selecting, photos are **resized client-side** before upload (see below), then uploaded to the session's folder. A simple progress indicator shows status.

Permissions: visible to **Admin** and **Check In** roles. Gallery visible to all roles.

### Method 2: PWA Share Target

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

The page fetches sessions filtered to today's date, presents them as large tap targets, and on selection uploads to that session's folder.

**Only works when installed as a PWA** (Add to Home Screen). The existing `site.webmanifest` makes this straightforward to add.

---

## Client-Side Resize

Mobile photos are typically 10–20 MB. Before upload, resize using the Canvas API:

- Max dimension: **1500px** (preserves enough detail for viewing)
- Target file size: **~500 KB**
- Convert HEIC to JPEG (Canvas output)

This keeps uploads fast over mobile data and reduces SharePoint storage usage. The resize happens in the browser before the file is sent to the server.

---

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/sessions/:id/media` | Upload one or more files (multipart/form-data) | Admin, Check In |
| `GET` | `/api/sessions/:id/media` | List files — returns name, URL, thumbnail URL | All roles |
| `DELETE` | `/api/sessions/:id/media/:fileId` | Delete a file | Admin only |

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
- **Delete**: `DELETE /drives/{driveId}/items/{itemId}`

For files under ~4 MB (after client-side resize), the simple PUT upload is sufficient. No upload session needed.

### Configuration

Add to environment variables:
```
MEDIA_LIBRARY_DRIVE_ID=   # Graph API Drive ID of the Media document library (not a GUID)
```

---

## Frontend Changes

### Session Detail Page

Add a **Photos** section below the entries list:

- Gallery grid of thumbnail images (tap to view full size)
- "Add Photos" area (Admin/Check In only): Take photo + Upload from gallery buttons
- Upload progress shown inline
- Delete button on each photo (Admin only, shown on hover/long-press)

### Share Target Page (`/share-target.html`)

- Simple page, no nav required
- Heading: "Which session is this for?"
- Lists today's sessions as large tap targets (group name + time)
- On tap: uploads photo(s) to that session, shows confirmation
- "Wrong day?" fallback link to sessions list

---

## Setup (One-Time)

1. Create the **"Media"** document library in the SharePoint Tracker site ✓ (already done)
2. Find the library's Drive ID — use "Discover Drives" on the admin page, or call `GET /api/photos/drives`
3. Add `MEDIA_LIBRARY_DRIVE_ID` to env vars (local `.env` and Azure App Service config)
4. Add `share_target` to `site.webmanifest`
5. Add `/share-target.html` to `public/`

---

## Out of Scope

- Automatic photo tagging or facial recognition
- Video uploads
- Public-facing photo gallery
- Compression beyond what Canvas resize provides

---

*Created: 2026-02-22*
