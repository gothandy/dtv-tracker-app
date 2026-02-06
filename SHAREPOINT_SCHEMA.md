# SharePoint List Structure Documentation

This document describes the SharePoint list schema for the Volunteer App backend.

---

## 1. Groups (Crews) List

**Purpose**: Stores volunteer group/crew information

**List GUID**: `68f9eb4a-1eea-4c1f-88e5-9211cf56e002`

### Columns

| Column Name | Internal Name | Type | Required | Max Length | Description |
|------------|---------------|------|----------|------------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | 255 | Group title |
| **Name** | Name | Single line of text | No | 255 | Short unique name for the Crew |
| **Description** | Description | Single line of text | No | 255 | Group description |
| **EventbriteSeriesID** | EventbriteSeriesID | Single line of text | No | 255 | Eventbrite Series identifier for the group |
| **Content Type ID** | ContentTypeId | Content Type Id | No | - | SharePoint content type (hidden) |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |
| **Created By** | Author | Person or Group | Auto | - | User who created the item (read-only) |
| **Modified By** | Editor | Person or Group | Auto | - | User who last modified the item (read-only) |

### Key Fields
- **Name**: Short identifier for the crew/group
- **EventbriteSeriesID**: Links to Eventbrite for event management

---

## 2. Sessions (Events) List

**Purpose**: Stores volunteer event/session information with dates, registrations, and hours tracking

**List GUID**: `857fc298-6eba-49ab-99bf-9712ef6b8448`

### Columns

| Column Name | Internal Name | Type | Required | Max Length | Description |
|------------|---------------|------|----------|------------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | 255 | Session/Event title |
| **Group** | Crew | Lookup | No | - | Links to Groups list (shows Title) |
| **Date** | Date | Date (Date only) | Yes | - | Event date |
| **Name** | Name | Single line of text | No | 255 | Event name |
| **Notes** | Description | Multiple lines of text | No | - | Planning notes, work done, and actions |
| **Count** | Registrations | Number | No | - | Registration count for the event |
| **Hours** | Hours | Number | No | - | Total hours recorded at event |
| **Financial Year** | FinancialYearFlow | Single line of text | No | 255 | Financial year classification |
| **EventbriteEventID** | EventbriteEventID | Single line of text | No | 255 | Eventbrite Event identifier |
| **EventbriteUrl** | Url | Hyperlink | No | - | Link to Eventbrite event page |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |
| **Created By** | Author | Person or Group | Auto | - | User who created the item (read-only) |
| **Modified By** | Editor | Person or Group | Auto | - | User who last modified the item (read-only) |

### Key Relationships
- **Group (Crew)**: Lookup to Groups list - associates the session with a volunteer crew/group

### Key Fields
- **Date**: Required field for the event date
- **Count (Registrations)**: Tracks how many people registered
- **Hours**: Tracks total volunteer hours for the session
- **EventbriteEventID**: Links to external Eventbrite system

---

## 3. Entries (Registrations) List

**Purpose**: Junction table linking volunteers to sessions - tracks registrations, check-ins, and hours per volunteer per session

**List GUID**: `8a362810-15ea-4210-9ad0-a98196747866`

### Columns

| Column Name | Internal Name | Type | Required | Default | Description |
|------------|---------------|------|----------|---------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | - | Registration title |
| **Session** | Event | Lookup (indexed) | No | - | Links to Sessions list (shows Title) |
| **Profile** | Volunteer | Lookup | No | - | Links to Profiles list (shows Title) |
| **Count** | Count | Number | No | 1 | For group registrations |
| **Check** | Checked | Yes/No | No | No | Check-in status for the volunteer |
| **Hours** | Hours | Number | No | - | Hours worked at this session |
| **Notes** | Notes | Single line of text | No | - | Tags: #New #Child #DofE #DigLead #FirstAider #Regular |
| **Financial Year** | FinancialYearFlow | Single line of text | No | - | Updated via Power Automate only |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |
| **Created By** | Author | Person or Group | Auto | - | User who created the item (read-only) |
| **Modified By** | Editor | Person or Group | Auto | - | User who last modified the item (read-only) |

### Key Relationships
- **Session (Event)**: Lookup to Sessions list - which event/session this registration is for (indexed for performance)
- **Profile (Volunteer)**: Lookup to Profiles list - which volunteer is registered

### Key Fields
- **Session**: Indexed lookup for fast filtering by event
- **Check (Checked)**: Boolean to track if volunteer showed up
- **Count**: Defaults to 1, allows for group registrations
- **Hours**: Individual hours worked at the session
- **Notes**: Supports hashtags for categorization (#New, #Child, #DofE, etc.)

### Data Model Notes
This is a **many-to-many junction table** that creates the relationship between:
- One Session can have many Registrations (many volunteers)
- One Profile can have many Registrations (attend many sessions)

---

## 4. Profiles (Volunteers) List

**Purpose**: Stores volunteer profile information including contact details and hours tracking

**List GUID**: `f3d3c40c-35cb-4167-8c83-c566edef6f29`

### Columns

| Column Name | Internal Name | Type | Required | Default | Description |
|------------|---------------|------|----------|---------|-------------|
| **ID** | ID | Counter | Auto | - | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | - | Profile title (typically volunteer name) |
| **Full Name** | LinkTitle | Computed | Auto | - | Computed link field from Title (read-only) |
| **Email** | Email | Single line of text | No | - | Volunteer email address |
| **Eventbrite Attendee Name** | MatchName | Single line of text | No | - | Name matching for Eventbrite integration |
| **IsGroup** | IsGroup | Yes/No | No | No | Flag indicating if this is a group profile |
| **HoursLastFY** | HoursLastFY | Number | No | - | Hours volunteered last financial year |
| **HoursThisFY** | HoursThisFY | Number | No | - | Hours volunteered this financial year |
| **Modified** | Modified | Date and Time | Auto | - | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | - | Creation timestamp (read-only) |
| **Created By** | Author | Person or Group | Auto | - | User who created the item (read-only) |
| **Modified By** | Editor | Person or Group | Auto | - | User who last modified the item (read-only) |

### Key Fields
- **Title**: Volunteer's name or identifier
- **Email**: Contact email for the volunteer
- **Eventbrite Attendee Name (MatchName)**: Used to match with Eventbrite registrations
- **IsGroup**: Boolean flag for group vs individual volunteers
- **HoursLastFY/HoursThisFY**: Aggregate hours tracking by financial year

### Integration Points
- **Eventbrite**: Uses MatchName field to sync with external Eventbrite registrations
- **Hours Tracking**: Aggregated from Entries (Registrations) list

---

## 5. Regulars List

**Purpose**: Tracks which volunteers are regular members of specific crews/groups

**List GUID**: `34b535f1-34ec-4fe6-a887-3b8523e492e1`

### Columns

| Column Name | Internal Name | Type | Required | Description |
|------------|---------------|------|----------|-------------|
| **ID** | ID | Counter | Auto | Unique identifier (Primary Key) |
| **Title** | Title | Single line of text | No | Regular membership title |
| **Volunteer** | Volunteer | Lookup | No | Links to Profiles list (shows Title) |
| **Crew** | Crew | Lookup | No | Links to Groups list (shows Title) |
| **Email** | Volunteer_x003a_Email | Lookup (dependent) | Auto | Email from Volunteer profile (read-only) |
| **Hours Last FY** | Volunteer_x003a_HoursLastFY | Lookup (dependent) | Auto | April 1st to last March 31st (read-only) |
| **Hours This FY** | Volunteer_x003a_HoursThisFY | Lookup (dependent) | Auto | Last April 1st to next March 31st (read-only) |
| **Modified** | Modified | Date and Time | Auto | Last modified timestamp (read-only) |
| **Created** | Created | Date and Time | Auto | Creation timestamp (read-only) |
| **Created By** | Author | Person or Group | Auto | User who created the item (read-only) |
| **Modified By** | Editor | Person or Group | Auto | User who last modified the item (read-only) |

### Key Relationships
- **Volunteer**: Lookup to Profiles list - which volunteer is a regular
- **Crew**: Lookup to Groups list - which crew/group they're regular with

### Dependent Lookup Fields
The list includes denormalized fields from the Volunteer lookup:
- **Email**: Shows volunteer's email address
- **Hours Last FY**: Shows volunteer's hours from previous financial year
- **Hours This FY**: Shows volunteer's hours from current financial year

### Data Model Notes
This is a **many-to-many junction table** that creates the relationship between:
- One Volunteer can be a Regular of many Crews
- One Crew can have many Regular volunteers

**Purpose**: Used to identify and track core/regular volunteers for each group, with quick access to their contact info and hours totals.

---

## Data Model Overview

### Entity Relationship Diagram

```
┌─────────────┐
│   Groups    │
│  (Crews)    │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────┐           ┌──────────────┐
│    Sessions     │◄──────────┤   Regulars   │
│    (Events)     │    N:N    │              │
└──────┬──────────┘           └──────┬───────┘
       │                              │
       │ 1:N                          │ N:1
       │                              │
┌──────▼──────────┐                  │
│     Entries     │                  │
│ (Registrations) │                  │
└──────┬──────────┘                  │
       │                              │
       │ N:1                    N:1   │
       │                              │
       └──────────────┬───────────────┘
                      │
               ┌──────▼──────┐
               │   Profiles  │
               │ (Volunteers)│
               └─────────────┘
```

### Key Relationships

1. **Groups → Sessions**: One group can have many sessions
2. **Sessions → Entries**: One session can have many registrations
3. **Profiles → Entries**: One volunteer can have many registrations
4. **Profiles → Regulars**: One volunteer can be regular for many groups
5. **Groups → Regulars**: One group can have many regular volunteers

### Workflow

1. **Groups** are created (e.g., "Tree Planting Crew", "River Cleanup Crew")
2. **Sessions** are scheduled for each group with dates
3. **Profiles** store volunteer information
4. **Entries** (Registrations) link volunteers to sessions when they sign up
5. **Regulars** identifies core volunteers for each group
6. **Eventbrite** integration syncs registrations via EventbriteEventID and MatchName fields

---

## Notes

- All lists include standard SharePoint metadata fields (ID, Created, Modified, Created By, Modified By)
- Field names with spaces are encoded in internal names (e.g., "Content Type" becomes "ContentType")
- Auto-generated fields are read-only and managed by SharePoint

## Usage

This schema can be used to:
- Build API integrations with SharePoint REST API
- Design forms and UI components
- Plan data migrations
- Document relationships between lists

---

*Last Updated: 2026-02-06*
