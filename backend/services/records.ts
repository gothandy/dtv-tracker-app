/**
 * Reading Records: one place for the Profile a Record belongs to, finding a Profile's
 * Record of a Type, and its status (through the shared evaluator, types/record-status.ts).
 */

import { SharePointRecord } from '../../types/sharepoint';
import { recordStatus } from '../../types/record-status';
import type { RecordTypeName } from '../../types/record-types';
import type { RecordResponse } from '../../types/api-responses';
import { safeParseLookupId } from './data-layer';

/** The ID of the Profile this Record belongs to. */
export function recordProfileId(record: SharePointRecord): number | undefined {
  return safeParseLookupId(record.ProfileLookupId as unknown as string);
}

/** Whether the Record is of this Type (a known Type name, checked at compile time). */
export function isOfType(record: SharePointRecord, type: RecordTypeName): boolean {
  return record.Type === type;
}

/** This Profile's Records. */
export function recordsForProfile(records: SharePointRecord[], profileId: number): SharePointRecord[] {
  return records.filter(r => recordProfileId(r) === profileId);
}

/**
 * The first of this Profile's Records of this Type, in list order. Profiles have at most one
 * Record of each Type today; Records v2 replaces this with the latest Record (#322 §3).
 */
export function findRecord(records: SharePointRecord[], profileId: number, type: string): SharePointRecord | undefined {
  return records.find(r => recordProfileId(r) === profileId && r.Type === type);
}

/** The Record's status as of `evaluationDate` (YYYY-MM-DD): today for Profiles, the Session's date for Sessions. */
export function statusOn(record: SharePointRecord, evaluationDate: string): string {
  return recordStatus(
    { status: record.Status || '' },
    evaluationDate,
  );
}

/** The Record as the app shows it, with its status as of `evaluationDate`. */
export function toRecordResponse(record: SharePointRecord, evaluationDate: string): RecordResponse {
  return {
    id: record.ID,
    type: record.Type || '',
    status: statusOn(record, evaluationDate),
    storedStatus: record.Status || '',
    date: record.Date || '',
    notes: record.Notes || undefined,
  };
}

/** Member and discount-card status per Profile, as of `evaluationDate`. */
export function buildBadgeLookups(records: SharePointRecord[], evaluationDate: string): {
  memberIds: Set<number>;
  cardStatusMap: Map<number, string>;
} {
  const memberIds = new Set<number>();
  const cardStatusMap = new Map<number, string>();
  for (const r of records) {
    const pid = recordProfileId(r);
    if (pid === undefined) continue;
    const status = statusOn(r, evaluationDate);
    if (isOfType(r, 'Charity Membership') && status === 'Accepted') memberIds.add(pid);
    if (isOfType(r, 'Discount Card') && status) cardStatusMap.set(pid, status);
  }
  return { memberIds, cardStatusMap };
}
