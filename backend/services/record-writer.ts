/**
 * Writing Records: every new or changed Record (Add, bulk Add, the consent page, Eventbrite
 * sync) goes through here, so Records v2 changes which date fields are written in one place.
 */

import { SharePointRecord } from '../../types/sharepoint';
import { recordsRepository } from './repositories/records-repository';
import { findRecord } from './records';

export interface RecordValues {
  profileId: number;
  type: string;
  status: string;
  /** Legacy Date: YYYY-MM-DD from a form, or a full timestamp when the tracker picks it. */
  date: string;
}

/** Creates a Record and returns it as it would be read back. */
export async function createRecord(values: RecordValues): Promise<SharePointRecord> {
  const fields = { ProfileLookupId: values.profileId, Type: values.type, Status: values.status, Date: values.date };
  const id = await recordsRepository.create(fields);
  return { ID: id, ...fields } as SharePointRecord;
}

/**
 * Sets the Profile's Record of this Type, creating it if there isn't one (the first match, as
 * findRecord). `statusAndDate` overwrites both; `statusIfChanged` changes only a different
 * Status and keeps the Date. A created Record is added to `records`, so later calls in the same
 * batch find it.
 */
export async function upsertRecord(
  records: SharePointRecord[],
  values: RecordValues,
  update: 'statusAndDate' | 'statusIfChanged',
): Promise<'created' | 'updated' | 'unchanged'> {
  const existing = findRecord(records, values.profileId, values.type);
  if (!existing) {
    records.push(await createRecord(values));
    return 'created';
  }
  if (update === 'statusIfChanged') {
    if (existing.Status === values.status) return 'unchanged';
    await recordsRepository.update(existing.ID, { Status: values.status });
    return 'updated';
  }
  await recordsRepository.update(existing.ID, { Status: values.status, Date: values.date });
  return 'updated';
}
