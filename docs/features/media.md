# Media Features

## Storage

Photos and videos live in a dedicated SharePoint **Media Library** (document library named "Media"), separate from the SharePoint lists used for data. Access via the same Graph API client already in place.

### Folder Structure

```
Media/
└── {groupKey}/
    └── {YYYY-MM-DD}/
        ├── 143022-a3f4.jpg
        └── 154301-c91b.mp4
```

Path derived from the session's group key and date — browsable directly in SharePoint without the app.

### File Naming

`{HHMMSS}-{4-char-random}.{ext}` — server-assigned at upload time (not the phone's original filename). Time-sortable within the day folder; collision-safe via random suffix.

`MEDIA_LIBRARY_DRIVE_ID` env var required (Graph API Drive ID of the Media library).

## Upload

Upload page at `/upload?entryId=:id`. Requires authentication — self-service users can upload to their own entries; Admin and Check In can upload to any entry.

Accepted formats: photos (JPG, PNG, WebP, HEIC) and short videos (MP4, MOV). Up to 10 files, 10 MB each.

Capture date is extracted server-side from EXIF data (images) or MP4/MOV container metadata (videos) and used when writing the file to SharePoint. Implementation: `media-upload.ts`.

Completion screen shows file count and links to the session gallery.

## Gallery

Session detail page shows a photo/video gallery with an inline lightbox. Rendered from `GET /api/media?groupKey=&date=`, which lists files from the session's folder in the Media library.

Videos play inline in the lightbox via `GET /api/media/:itemId/stream` (Graph API `/content` redirect).

Public users see only items marked `IsPublic`. The `name` and `webUrl` fields (which contain the uploader's name in the filename) are stripped from public API responses.

Photo counts for session cards are batch-fetched via `GET /api/media/counts?paths=gk/date,...` and cached.

## Cover Photo

Each session can have a designated cover photo (`coverMediaId` field). Resolved cover image bytes are cached server-side for 1 hour (`cover-cache.ts`); cache is busted when `coverMediaId` changes on a session PATCH. Displayed at 2:3 aspect ratio on session detail.

## Photo Taxonomy

Photo metadata (location, activity, photo type) is managed natively in the SharePoint Media library as columns — set up in SharePoint admin, not by the app. The app surfaces this metadata read-only in the lightbox by expanding `listItem/fields` when fetching folder contents.

See [docs/features/tagging.md](tagging.md) for the full three-tier taxonomy design, including the Tier 3 (photo metadata) implementation plan.

## Planned

- PWA share target — register app as a native share target so volunteers can share photos directly from their camera roll
- Surface photo metadata (Title, Location, Activity, PhotoType) in the lightbox once columns are added to the Media library in SharePoint
- GPS coordinate extraction from EXIF for potential map-based browsing
