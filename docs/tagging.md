# Tagging System Design

## Overview

Three distinct tagging tiers, each with a different purpose, storage home, and audience.

| Tier | What it describes | Storage | Status |
|------|------------------|---------|--------|
| People | A volunteer's role/circumstance at a session | `Entries.Notes` (hashtags) | Implemented |
| Session | What happened at the event | `Sessions.Metadata` (Managed Metadata column) | Implemented |
| Photo | Content of an individual image | Media library columns | Not yet |

## Architectural Decision — Media Library Management

**Photo metadata and tagging is managed natively in SharePoint, not through the app.**

The Media document library is a first-class SharePoint asset. All taxonomy setup (Managed Metadata term sets, custom columns, column configuration) is done directly in SharePoint admin. The app does not need to know about or manage the taxonomy — it only needs to:

1. **Write** — upload files to the correct `{groupKey}/{date}/` folder (already implemented)
2. **Read** — fetch files from that folder including their SharePoint metadata for display

The folder structure (`{groupKey}/{date}/`) is the **glue** between the two systems. SharePoint folders map directly to sessions via group key and date, without any app-managed linkage.

This means:
- The taxonomy (trails, activities, photo types) can evolve entirely within SharePoint without app changes
- SharePoint's native views, filtering, and search work out of the box for anyone with SP access
- The app surfaces metadata read-only (in the lightbox) rather than owning it

### First App-side step

Extend `listFolderPhotos` to also expand `listItem/fields` on each file:

```
GET /drives/{driveId}/root:/{path}:/children
  ?$select=id,name,webUrl,file
  &$expand=thumbnails,listItem($expand=fields)
```

This returns whatever columns exist on the library (Title, Managed Metadata fields, custom columns) without the app needing to know their names in advance. The lightbox renders what's present.

---

## Tier 1 — People Tags (Entry-level)

Tags on an `Entry` record describe **a specific volunteer's role or circumstance at a specific session**.

**Current hashtags** (stored in `Entries.Notes`):
- `#New` — first session (may be calculable in future)
- `#Child` — under-18 volunteer
- `#DofE` — Duke of Edinburgh participant
- `#DigLead` — acting as dig leader
- `#FirstAider` — acting as first aider
- `#Regular` — regular attendee (may be retired; derivable from Regulars list)
- `#NoPhoto` — consent flag: do not appear in published photos

**Notes:**
- `#Regular` is a candidate for retirement once the Regulars list is consistently populated.
- `#NoPhoto` is privacy-relevant — any photo tagging system must cross-reference this flag.
- These tags are per-person per-session, not per-session or per-photo.

---

## Tier 2 — Session Tags

Tags on a `Session` record describe **what the group did and where**, independent of any individual volunteer.

### Location Hierarchy

Trails have a four-level hierarchy:

```
Discipline > Trail > Area > Section
```

**Examples:**
```
XC > Freeminers > Boneyard > Bottom Section
XC > Freeminers > Boneyard > Top Section
DH > Corkscrew > Middle Section
DH > Corkscrew > Lower Section
```

A session will typically cover one or more named areas or sections. The location tag might be multi-value (a session can work multiple areas).

### Activity Hierarchy

Activities split into broad type and specific task:

```
Type > Task
```

**Examples:**
```
Feature > Berm
Feature > Jump
Feature > Tabletop
Feature > Boardwalk
Feature > Drop

Maintenance > Drainage
Maintenance > Erosion Repair
Maintenance > Vegetation Clearance
Maintenance > Tread Repair
Maintenance > Signage
```

A session may involve multiple activities, so this should also be multi-value.

### Session Tag Storage — Implemented

Tags are stored in a **Managed Metadata column** (`Metadata`) on the Sessions list, linked to a SharePoint Term Store term set. The app:

- **Reads**: fetches `Sessions.Metadata` field via Graph API; extracts labels via `extractMetadataTags()`
- **Writes**: via the hidden companion field (see below) — no extra permissions needed
- **Taxonomy**: reads from Term Store via `GET /api/tags/taxonomy` → `sharePointClient.getTermSetTree()`

#### Write mechanism — hidden companion field (Graph API)
The Graph API `/items/{id}/fields` PATCH **rejects all direct writes** to Managed Metadata fields (400 "Invalid request" for every format). The workaround: every taxonomy column has a hidden companion field whose `displayName` is `{ColumnName}_0` and whose Graph API `name` is a GUID-like string (e.g. `g66e7e4fecb04f258f5225e97aa70a86`). Writing to this hidden field with the SharePoint taxonomy string format `-1;#Label|TermGuid;-1;#Label2|TermGuid2` updates the MM column natively — no extra permissions or SharePoint REST API needed. The hidden field name is discovered at runtime via `GET /columns?expand=hidden` and cached in memory.

#### Term Store API notes (discovered during implementation)
- Requires `TermStore.ReadWrite.All` application permission on the Azure app registration (with admin consent)
- Must use the **beta** Graph API endpoint — v1.0 term store access is not available without specific configuration
- `$expand=children` is **silently ignored** on `/sets/{id}/children` in the beta API
- Children must be fetched recursively: `GET /beta/termStore/sets/{setId}/terms/{termId}/children`
- Terms only expose: `id`, `labels`, `descriptions`, `createdDateTime`, `lastModifiedDateTime` — no `parent`, no `isDeprecated`
- `$expand=termColumn` is not supported on either v1.0 or beta columns endpoint — term set ID resolved from `TAXONOMY_TERM_SET_ID` env var

#### Configuration
- `TAXONOMY_TERM_SET_ID` env var: term set GUID (`14c7dfc2-ee1e-4c30-80f3-0d9149045311`)
- Term taxonomy is managed directly in the SharePoint Term Store admin — the app reads it dynamically

### Inheritance Value

Session tags are the most valuable tier because they **cascade to photos by default**. When a volunteer uploads photos from a session, the session's location and activity tags become the pre-populated defaults — no manual tagging effort required at upload time.

---

## Tier 3 — Photo Tags

Tags on an individual photo describe **the content of that specific image**.

### Dimensions

| Dimension | Source | Notes |
|-----------|--------|-------|
| Location | Inherited from session (overridable) | e.g. "DH > Corkscrew > Middle Section" |
| Activity | Inherited from session (overridable) | e.g. "Feature > Berm" |
| Photo type | Set at upload or post-upload | See below |
| People | Optional, separate | Privacy-sensitive — see below |

### Photo Type Tags

A separate dimension describing the nature of the shot:

- `Before` / `After` — progress documentation
- `Group shot` — whole crew photo
- `Work in progress` — action shot during the session
- `Tools / Equipment`
- `Landscape / Overview`

### People in Photos

Identifying specific volunteers in photos is a **separate, optional dimension** and should be treated carefully:

- Entry-level `#NoPhoto` flags must be respected — photos of these volunteers should not be tagged with their name or published.
- GDPR/consent applies — tagging identifiable individuals requires explicit consent.
- This dimension is lower priority and should only be considered once consent workflows are solid.

### Photo Tag Storage

All photo metadata lives in the SharePoint Media document library as native columns — set up and maintained in SharePoint admin, not by the app. The app reads these fields via Graph API and displays them in the lightbox.

Suggested columns to add to the Media library in SharePoint:
- `Title` — already exists on all SP libraries; use for a human caption
- `Location` — Managed Metadata column linked to the Trail Locations term set
- `Activity` — Managed Metadata column linked to the Activities term set
- `PhotoType` — Choice column (Before, After, Work in progress, Group shot, Overview)

The app reads these by expanding `listItem/fields` when fetching the folder contents. No write path needed from the app — curators tag photos directly in SharePoint.

GPS coordinates (latitude/longitude) are already embedded in most phone photos as EXIF data. We currently extract `DateTimeOriginal` — extending this to extract GPS is a future option if map-based browsing becomes useful.

---

## Relationships Between Tiers

```
Session (location + activity tags)
  └─→ Photos inherit session tags as defaults
  └─→ Entries inherit session context (date, group)

Entry (people tags: role, consent)
  └─→ #NoPhoto flag filters what photos can be tagged/published
  └─→ Uploader identity already captured in photo filename
```

---

## Open Questions

1. **Location taxonomy owner** — who maintains the trail/section list? Should it be editable from the admin page, or managed directly in SharePoint?

2. **Multi-value locations per session** — if a session covers multiple areas, how is this represented? Comma-separated? Multiple rows?

3. **GPS extraction** — worth enabling for automatic location data from phone photos? Would need a reverse-geocode or a mapping of GPS bounds to named trail sections.

4. **Post-upload photo curation** — is there a workflow for reviewing and tagging photos after a session, or must all tagging happen at upload time?

5. **Publish/visibility flag** — should photos have a published/draft state? Especially relevant given `#NoPhoto` consent.

6. **Mapping UI** — does "mapping" mean filtering photos by named location, or displaying them on an actual map? The former is straightforward; the latter requires GPS data or manual coordinate assignment.

---

## Implementation Sequencing (Suggested)

### SharePoint setup (outside the app)
1. Create Term Sets in the SharePoint Term Store: **Trail Locations** and **Activities**
2. Add Managed Metadata columns (`Location`, `Activity`) and a Choice column (`PhotoType`) to the Media document library
3. Curators tag photos directly in SharePoint — no app involvement needed

### App changes
1. **Surface metadata in lightbox** — extend `listFolderPhotos` to expand `listItem/fields`; render Title and any present metadata fields below each photo in the lightbox
2. **Session tags** — add Location and Activity columns to the Sessions list (separate from media; useful for filtering and reporting)
3. **GPS extraction** — extend `exifDate()` in `media-upload.ts` to also extract GPS; future option for map-based browsing
4. **People in photos** — only after consent workflows are solid
