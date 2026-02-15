/**
 * SharePoint field name constants
 *
 * Maps logical field names to SharePoint internal column names.
 * The Members site uses legacy names (Crew, Event, Volunteer).
 * The Tracker site uses clean names (Group, Session, Profile).
 * Detected automatically from SHAREPOINT_SITE_URL.
 *
 * Once the Members site is retired, delete the ternaries and keep the clean names.
 */

const legacy = process.env.SHAREPOINT_SITE_URL?.endsWith('/members') ?? true;

// Lookup ID fields (the "LookupId" suffix is a SharePoint convention)
export const GROUP_LOOKUP     = legacy ? 'CrewLookupId'      : 'GroupLookupId';
export const SESSION_LOOKUP   = legacy ? 'EventLookupId'     : 'SessionLookupId';
export const PROFILE_LOOKUP   = legacy ? 'VolunteerLookupId' : 'ProfileLookupId';

// Lookup display fields (the display value returned alongside the ID)
export const GROUP_DISPLAY    = legacy ? 'Crew'      : 'Group';
export const SESSION_DISPLAY  = legacy ? 'Event'     : 'Session';
export const PROFILE_DISPLAY  = legacy ? 'Volunteer' : 'Profile';

// Other renamed fields
export const SESSION_NOTES    = legacy ? 'Description' : 'Notes';
