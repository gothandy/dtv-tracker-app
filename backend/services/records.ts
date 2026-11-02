/**
 * Reading Records: one place for the Profile a Record belongs to, finding a Profile's
 * Record of a Type, and its status (through the shared evaluator, types/record-status.ts).
 */

import { SharePointRecord } from '../../types/sharepoint';
import { recordStatus } from '../../types/record-status';
import { safeParseLookupId } from './data-layer';

/** The ID of the Profile this Record belongs to. */
export function recordProfileId(record: SharePointRecord): number | undefined {
  return safeParseLookupId(record.ProfileLookupId as unknown as string);
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
    { status: record.Status || '', start: record.Start || undefined, end: record.End || undefined },
    evaluationDate,
  );
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
    if (r.Type === 'Charity Membership' && status === 'Accepted') memberIds.add(pid);
    if (r.Type === 'Discount Card' && status) cardStatusMap.set(pid, status);
  }
  return { memberIds, cardStatusMap };
}
