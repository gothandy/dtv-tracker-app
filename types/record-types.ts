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
