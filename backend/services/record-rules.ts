/**
 * The rules in code that read Records (Records v2, #322 §4): badges, benefits and warnings, in
 * one place. Each reads the Profile's current Record of a Type (records.ts) and matches its
 * State by the Names in RULE_STATES.
 */

import { SharePointRecord } from '../../types/sharepoint';
import { RULE_STATES } from '../../types/record-types';
import { currentRecords, recordStateName, recordType } from './records';

export interface RecordFlags {
  isMember: boolean;
  /** The current Discount Card State's Name (e.g. Accepted, Invited), or null for none. */
  cardStatus: string | null;
  /** Holds a First Aid Certificate whose Date (the expiry) is today or later. */
  isFirstAider: boolean;
  noPhoto: boolean;
  hasPrivacyConsent: boolean;
  isDofE: boolean;
}

const is = (r: SharePointRecord | undefined, rule: { type: string; name: string }) =>
  !!r && recordType(r) === rule.type && recordStateName(r) === rule.name;

/** The flags for one Profile's Records, as of `today` (YYYY-MM-DD). */
export function recordFlags(profileRecords: SharePointRecord[], today: string): RecordFlags {
  const current = new Map(currentRecords(profileRecords).map(r => [recordType(r), r]));
  const firstAid = current.get(RULE_STATES.firstAider.type);
  const card = current.get('Discount Card');
  return {
    isMember: is(current.get(RULE_STATES.member.type), RULE_STATES.member),
    cardStatus: card ? recordStateName(card) || null : null,
    isFirstAider: is(firstAid, RULE_STATES.firstAider) && (firstAid!.Date ?? '').substring(0, 10) >= today,
    noPhoto: !is(current.get(RULE_STATES.photoConsent.type), RULE_STATES.photoConsent),
    hasPrivacyConsent: is(current.get(RULE_STATES.privacyConsent.type), RULE_STATES.privacyConsent),
    isDofE: is(current.get(RULE_STATES.dofe.type), RULE_STATES.dofe),
  };
}
