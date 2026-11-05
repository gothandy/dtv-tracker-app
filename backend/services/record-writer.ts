/**
 * Writing Records: every new or changed Record (Add, bulk Add, the consent page, Eventbrite
 * sync) goes through here. A Record's State is given by Type and State Name and written as the
 * State lookup (Records v2, #322).
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
  const fields = { ProfileLookupId: values.profileId, StateLookupId: state.id, Date: values.date };
  const id = await recordsRepository.create(fields);
  return { ID: id, ...fields, State: state } as SharePointRecord;
}

/**
 * Gives the Profile this State for the Type (Records v2: a new State is a new Record, #322 §1).
 * - No Record of the Type, or the current one has another State: creates a Record.
 * - The current Record already has the State: `refreshDate` sets its Date (the consent page,
 *   bulk Add); `leave` changes nothing (Eventbrite sync, whose dates are unreliable).
 * A created Record is added to `records`, so later calls in the same batch see it.
 */
export async function setRecordState(
  records: SharePointRecord[],
  values: RecordValues,
  sameState: 'refreshDate' | 'leave',
): Promise<'created' | 'updated' | 'unchanged'> {
  const current = currentRecord(records, values.profileId, values.type);
  if (!current || recordStateName(current) !== values.status) {
    records.push(await createRecord(values));
    return 'created';
  }
  if (sameState === 'leave') return 'unchanged';
  await recordsRepository.update(current.ID, { Date: values.date });
  current.Date = values.date;
  return 'updated';
}
