/**
 * The Record Types the code's rules name (badges, consent, warnings), keyed by the SharePoint
 * Type value. Where code must name a Type, `RecordTypeName` makes a misspelling a compile
 * error. Each Type's statuses, labels and Notes hints are content in SharePoint (the
 * States list, Records v2 #322), not here.
 */

export const RECORD_TYPE_NAMES = [
  'Privacy Consent',
  'Photo Consent',
  'Newsletter Consent',
  'Facebook Group',
  'Charity Membership',
  'Discount Card',
  'Parking Permit',
  'Bike Park Wales',
  'First Aid Certificate',
  'DofE',
] as const;

export type RecordTypeName = typeof RECORD_TYPE_NAMES[number];

/**
 * The States the rules in code match on, by Type and State Name: named once here (#195 part 2,
 * as Entry Labels are). The Names are as the Records migration created them; renaming one in
 * the States list means changing it here too.
 */
export const RULE_STATES = {
  /** Charity Membership: a member. */
  member: { type: 'Charity Membership', name: 'Accepted' },
  /** Photo Consent: given (otherwise No Photo). */
  photoConsent: { type: 'Photo Consent', name: 'Accepted' },
  /** Privacy Consent: given (otherwise No Consent before a booking). */
  privacyConsent: { type: 'Privacy Consent', name: 'Accepted' },
  /** First Aid Certificate: held, until its Date (the expiry). */
  firstAider: { type: 'First Aid Certificate', name: 'Expires' },
  /** DofE: taking part. */
  dofe: { type: 'DofE', name: 'Active' },
} as const satisfies Record<string, { type: RecordTypeName; name: string }>;
