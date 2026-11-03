/**
 * SharePoint field name constants
 *
 * Maps logical field names to SharePoint internal column names.
 */

// Lookup ID fields (the "LookupId" suffix is a SharePoint convention)
export const GROUP_LOOKUP     = 'GroupLookupId';
export const SESSION_LOOKUP   = 'SessionLookupId';
export const PROFILE_LOOKUP   = 'ProfileLookupId';
export const PROJECT_LOOKUP   = 'ProjectLookupId';

// Lookup display fields (the display value returned alongside the ID)
export const GROUP_DISPLAY    = 'Group';
export const SESSION_DISPLAY  = 'Session';
export const PROFILE_DISPLAY  = 'Profile';
export const PROJECT_DISPLAY  = 'Project';

// Accompanying adult lookup (Entries list)
export const ACCOMPANYING_ADULT_LOOKUP  = 'AccompanyingAdultLookupId';
export const ACCOMPANYING_ADULT_DISPLAY = 'AccompanyingAdult';

// Other fields
export const SESSION_NOTES       = 'Notes';
export const SESSION_METADATA    = 'Metadata';
export const PROJECT_DESCRIPTION = 'Description';
export const PROJECT_METADATA    = 'Metadata';
export const PROJECT_STATUS      = 'Status';   // Choice; options come from the column (GET /api/projects/options)
export const SESSION_COVER_MEDIA = 'CoverMediaLookupId'; // Lookup to Media library (ID field, consistent with GROUP_LOOKUP pattern)
export const SESSION_STATS       = 'Stats';  // Pre-computed JSON stats stored on Session items (avoid full entries scan on listing views)
export const SESSION_LIMITS      = 'Limits'; // Per-session capacity limits JSON: {"new": 4, "total": 16}
export const SESSION_TIME        = 'Time';   // Start time HH:MM (24-hour clock)
export const SESSION_LENGTH      = 'Length'; // Session duration in hours
export const PROFILE_STATS       = 'Stats';  // Same field name on Profiles list
export const RECORD_STATE_LOOKUP = 'StateLookupId'; // Records: lookup to the States list (Records v2 #322; set by the migration, read from PR 1)
export const RECORD_STATE        = 'State';        // Records: the State lookup column's internal name
export const STATE_NAME          = 'Name';         // States: the State's name (Title isn't used; left blank)
export const STATE_TYPE          = 'RecordType';   // States: the Record Type the State belongs to ("Record Type"; the name Type clashes with SharePoint's built-in DocIcon column)
export const RECORD_NOTES        = 'Notes';  // Records: single line of text
export const ENTRY_CANCELLED             = 'Cancelled';         // Date/time when entry was cancelled; null = active booking
export const ENTRY_LABELS                = 'Labels';            // Multi-select choice: Regular | CSR | Late | FirstAider | DigLead
export const ENTRY_EVENTBRITE_ATTENDEE_ID = 'EventbriteAttendeeID'; // Eventbrite attendee ID — source of truth for the Eventbrite icon
