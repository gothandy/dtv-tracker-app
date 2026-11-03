/**
 * The Record Types, defined once in code (#322 §3), keyed by the SharePoint Type choice.
 * Shared by the server and the browser. Code asks a Type's properties here; where it must
 * name a Type, `RecordTypeName` makes a misspelling a compile error.
 *
 * Not shown in the app yet: Records v2 PR 1 uses the description (below Type in Add and
 * Edit), the date fields and the Notes hint (placeholder).
 */

/** Which date fields a Type uses in Add and Edit: Start only, or Start and End. Start is always optional. */
export type RecordDateFields = 'start' | 'startAndEnd';

export interface RecordTypeDefinition {
  /** Short description, shown below the Type dropdown and as the chip's hover help. */
  description: string;
  dateFields: RecordDateFields;
  /** Placeholder for Notes when empty. */
  notesHint?: string;
}

export const RECORD_TYPES = {
  'Privacy Consent':       { description: 'Consent to store/use data for volunteer coordination', dateFields: 'start' },
  'Photo Consent':         { description: 'Consent for DTV photo/video communications', dateFields: 'start' },
  'Newsletter Consent':    { description: 'Consent for regular DTV activity communications', dateFields: 'start', notesHint: 'Email' },
  'Facebook Group':        { description: 'Invitation to closed DTV Members Facebook group', dateFields: 'start', notesHint: 'Facebook Name' },
  'Charity Membership':    { description: 'Formal voting membership under charity constitution', dateFields: 'startAndEnd' },
  'Discount Card':         { description: 'DTV Discount Card, 15h volunteering in the year', dateFields: 'startAndEnd' },
  'Parking Permit':        { description: 'Forestry England annual parking permit, 30h+ annually', dateFields: 'startAndEnd', notesHint: 'Two Veh. Reg.' },
  'Bike Park Wales':       { description: 'One-off free uplift day for 30h+ in a year', dateFields: 'startAndEnd' },
  'First Aid Certificate': { description: 'Latest qualification required for First Aider role', dateFields: 'startAndEnd', notesHint: 'Certificate Details' },
  'DofE':                  { description: 'DofE volunteering with DTV; level and ID may be supplied later', dateFields: 'startAndEnd', notesHint: 'Award / eDofE ID (e.g. Gold 1223123)' },
} as const satisfies Record<string, RecordTypeDefinition>;

export type RecordTypeName = keyof typeof RECORD_TYPES;

/** The Type's definition, or undefined for a Type the code doesn't know (e.g. one added in SharePoint). */
export function recordType(name: string | undefined): RecordTypeDefinition | undefined {
  return name && name in RECORD_TYPES ? RECORD_TYPES[name as RecordTypeName] : undefined;
}
