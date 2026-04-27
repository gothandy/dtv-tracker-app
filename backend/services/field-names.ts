/**
 * SharePoint field name constants
 *
 * Maps logical field names to SharePoint internal column names.
 */

// Lookup ID fields (the "LookupId" suffix is a SharePoint convention)
export const GROUP_LOOKUP     = 'GroupLookupId';
export const SESSION_LOOKUP   = 'SessionLookupId';
export const PROFILE_LOOKUP   = 'ProfileLookupId';

// Lookup display fields (the display value returned alongside the ID)
export const GROUP_DISPLAY    = 'Group';
export const SESSION_DISPLAY  = 'Session';
export const PROFILE_DISPLAY  = 'Profile';

// Accompanying adult lookup (Entries list)
export const ACCOMPANYING_ADULT_LOOKUP  = 'AccompanyingAdultLookupId';
export const ACCOMPANYING_ADULT_DISPLAY = 'AccompanyingAdult';

// Other fields
export const SESSION_NOTES       = 'Notes';
export const SESSION_METADATA    = 'Metadata';
export const SESSION_COVER_MEDIA = 'CoverMediaLookupId'; // Lookup to Media library (ID field, consistent with GROUP_LOOKUP pattern)
export const SESSION_STATS       = 'Stats';  // Pre-computed JSON stats stored on Session items (avoid full entries scan on listing views)
export const SESSION_LIMITS      = 'Limits'; // Per-session capacity limits JSON: {"new": 4, "total": 16}
export const PROFILE_STATS       = 'Stats';  // Same field name on Profiles list
export const ENTRY_CANCELLED             = 'Cancelled';         // Date/time when entry was cancelled; null = active booking
export const ENTRY_LABELS                = 'Labels';            // Multi-select choice: Regular | CSR | Late | FirstAider | DigLead
export const ENTRY_EVENTBRITE_ATTENDEE_ID = 'EventbriteAttendeeID'; // Eventbrite attendee ID — source of truth for the Eventbrite icon
