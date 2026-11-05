/**
 * Reading Records (Records v2, #322): the one place for a Record's Profile, Type and State, the
 * current Record of a Type, and how a Record shows. Records come from recordsRepository.getAll()
 * with their State attached; nothing else reads the Records Type or Status columns.
 */

import { SharePointRecord } from '../../types/sharepoint';
import { RULE_STATES, type RecordTypeName } from '../../types/record-types';
import type { RecordResponse } from '../../types/api-responses';
import { stateLabel, stateStyle, type RecordState } from '../../types/record-state';
import { safeParseLookupId } from './data-layer';

/** The ID of the Profile this Record belongs to. */
export function recordProfileId(record: SharePointRecord): number | undefined {
  return safeParseLookupId(record.ProfileLookupId as unknown as string);
}

/** The Record's Type, from its State ('' if it has none). */
export function recordType(record: SharePointRecord): string {
  return record.State?.type ?? '';
}

/** The Name of the Record's State ('' if it has none): what the rules in code match on. */
export function recordStateName(record: SharePointRecord): string {
  return record.State?.name ?? '';
}

/** Whether the Record is of this Type (a known Type name, checked at compile time). */
export function isOfType(record: SharePointRecord, type: RecordTypeName): boolean {
  return recordType(record) === type;
}

/** This Profile's Records. */
export function recordsForProfile(records: SharePointRecord[], profileId: number): SharePointRecord[] {
  return records.filter(r => recordProfileId(r) === profileId);
}

/** Orders Records oldest first: by Date (a blank Date is the earliest), then by ID. */
function compareRecords(a: SharePointRecord, b: SharePointRecord): number {
  const da = (a.Date ?? '').substring(0, 10);
  const db = (b.Date ?? '').substring(0, 10);
  if (da !== db) return da < db ? -1 : 1;
  return a.ID - b.ID;
}

/** The Profile's current Record of this Type: the latest by Date, then the higher ID (#322 §1). */
export function currentRecord(records: SharePointRecord[], profileId: number, type: string): SharePointRecord | undefined {
  let current: SharePointRecord | undefined;
  for (const r of records) {
    if (recordProfileId(r) !== profileId || recordType(r) !== type) continue;
    if (!current || compareRecords(r, current) > 0) current = r;
  }
  return current;
}

/** Only the current Record of each Profile and Type (Records with no Profile or State are left out). */
export function currentRecords(records: SharePointRecord[]): SharePointRecord[] {
  const current = new Map<string, SharePointRecord>();
  for (const r of records) {
    const pid = recordProfileId(r);
    const type = recordType(r);
    if (pid === undefined || !type) continue;
    const key = `${pid}\u0000${type}`;
    const held = current.get(key);
    if (!held || compareRecords(r, held) > 0) current.set(key, r);
  }
  return [...current.values()];
}

/** The State with this Type and Name, if the States list has one. */
export function findState(states: RecordState[], type: string, name: string): RecordState | undefined {
  return states.find(s => s.type === type && s.name === name);
}

/** The Record as the app shows it: its State, and the label and style it shows on `onDate` (YYYY-MM-DD). */
export function toRecordResponse(record: SharePointRecord, onDate: string): RecordResponse {
  const state = record.State;
  const name = recordStateName(record);
  return {
    id: record.ID,
    type: recordType(record),
    stateId: state?.id,
    stateName: name,
    label: state ? stateLabel(state, record.Date, onDate) : name,
    style: state ? stateStyle(state, record.Date, onDate) : undefined,
    date: record.Date || '',
    notes: record.Notes || undefined,
  };
}

/** Member and Discount Card State per Profile, from each Profile's current Records. */
export function buildBadgeLookups(records: SharePointRecord[]): {
  memberIds: Set<number>;
  cardStatusMap: Map<number, string>;
} {
  const memberIds = new Set<number>();
  const cardStatusMap = new Map<number, string>();
  for (const r of currentRecords(records)) {
    const pid = recordProfileId(r)!;
    const name = recordStateName(r);
    if (isOfType(r, RULE_STATES.member.type) && name === RULE_STATES.member.name) memberIds.add(pid);
    if (isOfType(r, 'Discount Card') && name) cardStatusMap.set(pid, name);
  }
  return { memberIds, cardStatusMap };
}
