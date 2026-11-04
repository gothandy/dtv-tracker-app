/**
 * Writing Records: every new or changed Record (Add, bulk Add, the consent page, Eventbrite
 * sync) goes through here. A Record's State is given by Type and State Name and written as the
 * State lookup (Records v2, #322); the old Type and Status columns are written alongside until
 * they're deleted (#323).
 */

import { SharePointRecord } from '../../types/sharepoint';
import type { RecordState } from '../../types/record-state';
import { recordsRepository } from './repositories/records-repository';
import { statesRepository } from './repositories/states-repository';
import { currentRecord, findState, recordStateName } from './records';

export interface RecordValues {
  profileId: number;
  type: string;
  /** The State's Name. */
  status: string;
  /** YYYY-MM-DD from a form, or a full timestamp when the tracker picks it. */
  date: string;
}

/** The State for this Type and Name, or an error saying which is missing from the States list. */
export async function requireState(type: string, name: string): Promise<RecordState> {
  const state = findState(await statesRepository.getStates(), type, name);
  if (!state) throw new Error(`The States list has no State "${name}" for ${type}`);
  return state;
}

/** Creates a Record and returns it as it would be read back. */
export async function createRecord(values: RecordValues): Promise<SharePointRecord> {
  const state = await requireState(values.type, values.status);
  const fields = { ProfileLookupId: values.profileId, StateLookupId: state.id, Type: values.type, Status: values.status, Date: values.date };
  const id = await recordsRepository.create(fields);
  return { ID: id, ...fields, State: state } as SharePointRecord;
}

/**
 * Sets the Profile's current Record of this Type (currentRecord), creating one if there isn't
 * one. `statusAndDate` overwrites both; `statusIfChanged` changes only a different State and
 * keeps the Date. A created Record is added to `records`, so later calls in the same batch find it.
 */
export async function upsertRecord(
  records: SharePointRecord[],
  values: RecordValues,
  update: 'statusAndDate' | 'statusIfChanged',
): Promise<'created' | 'updated' | 'unchanged'> {
  const existing = currentRecord(records, values.profileId, values.type);
  if (!existing) {
    records.push(await createRecord(values));
    return 'created';
  }
  if (update === 'statusIfChanged' && recordStateName(existing) === values.status) return 'unchanged';
  const state = await requireState(values.type, values.status);
  const fields = update === 'statusIfChanged'
    ? { StateLookupId: state.id, Status: values.status }
    : { StateLookupId: state.id, Status: values.status, Date: values.date };
  await recordsRepository.update(existing.ID, fields);
  Object.assign(existing, fields, { State: state });
  return 'updated';
}
