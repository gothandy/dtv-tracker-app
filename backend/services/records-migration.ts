/**
 * Records v2 migration (#322 §5), run from Tools. For each Record without a State: match on
 * Type, then Status, in the States list; use that State, or insert one (Name = the Status,
 * Type = the Record's Type); set the Record's State lookup to it. It never changes a Record's
 * Type, Status, Date or Notes. A dry run reports what it would do and writes nothing.
 * Temporary: removed in Records v2 PR 1 (#323).
 */

import { sharePointClient } from './sharepoint-client';
import { statesRepository, type SharePointState } from './repositories/states-repository';
import { sharePoint } from '../config';
import { RECORD_STATE, RECORD_STATE_LOOKUP } from './field-names';
import { safeParseLookupId } from './data-layer';

export interface MigrationRecord {
  ID: number;
  Type?: string;
  Status?: string;
  StateLookupId?: number | string;
}

const key = (type: string, name: string) => `${type}\u0000${name}`;

export interface MigrationPlan {
  /** States to insert: one per Type and Status not yet in the States list. */
  statesToInsert: Array<{ type: string; name: string }>;
  /** Records to set, by Type then Status, with how many. */
  recordsToSet: Record<string, Record<string, number>>;
  /** Records already with a State (skipped). */
  alreadySet: number;
  /** Records with no Type or no Status (skipped, need a look). */
  missingTypeOrStatus: Array<{ id: number; type: string; status: string }>;
}

/** What the migration would do, from the Records and the States list as they are. */
export function planMigration(records: MigrationRecord[], states: SharePointState[]): MigrationPlan {
  const existing = new Set(states.filter(s => s.Type && s.Name).map(s => key(s.Type!, s.Name!)));
  const toInsert = new Map<string, { type: string; name: string }>();
  const recordsToSet: MigrationPlan['recordsToSet'] = {};
  const missingTypeOrStatus: MigrationPlan['missingTypeOrStatus'] = [];
  let alreadySet = 0;

  for (const r of records) {
    if (safeParseLookupId(r.StateLookupId) !== undefined) { alreadySet++; continue; }
    const type = r.Type?.trim() ?? '';
    const status = r.Status?.trim() ?? '';
    if (!type || !status) { missingTypeOrStatus.push({ id: r.ID, type, status }); continue; }
    if (!existing.has(key(type, status))) toInsert.set(key(type, status), { type, name: status });
    recordsToSet[type] ??= {};
    recordsToSet[type][status] = (recordsToSet[type][status] ?? 0) + 1;
  }

  return { statesToInsert: [...toInsert.values()], recordsToSet, alreadySet, missingTypeOrStatus };
}

export interface MigrationReport extends MigrationPlan {
  environment: string;
  generatedAt: string;
  dryRun: boolean;
  recordsTotal: number;
  statesBefore: number;
  /** After a run: Records set, and any that failed. */
  recordsSet?: number;
  errors?: string[];
}

/** Records with their Type, Status and State. Throws a plain message if the State column isn't there yet. */
async function readRecords(): Promise<MigrationRecord[]> {
  const columns = await sharePointClient.getListColumns(sharePoint.lists.records, { fresh: true });
  if (!columns.some((c: any) => c.name === RECORD_STATE)) {
    throw new Error(`The Records list has no "${RECORD_STATE}" column yet: add it as a lookup to the States list first.`);
  }
  return await sharePointClient.getListItems(sharePoint.lists.records, `ID,Type,Status,${RECORD_STATE_LOOKUP}`) as MigrationRecord[];
}

export async function runRecordsMigration(options: { dryRun: boolean; environment: string }): Promise<MigrationReport> {
  const [records, states] = await Promise.all([readRecords(), statesRepository.getAll()]);
  const plan = planMigration(records, states);
  const report: MigrationReport = {
    environment: options.environment,
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    recordsTotal: records.length,
    statesBefore: states.length,
    ...plan,
  };
  if (options.dryRun) return report;

  // Return or insert each State, then set every Record without one
  const stateIds = new Map(states.filter(s => s.Type && s.Name).map(s => [key(s.Type!, s.Name!), s.ID]));
  for (const s of plan.statesToInsert) {
    stateIds.set(key(s.type, s.name), await statesRepository.create({ Name: s.name, Type: s.type }));
  }

  const toSet = records.filter(r => safeParseLookupId(r.StateLookupId) === undefined && r.Type?.trim() && r.Status?.trim());
  const errors: string[] = [];
  let recordsSet = 0;
  for (let i = 0; i < toSet.length; i += 10) {
    await Promise.all(toSet.slice(i, i + 10).map(async r => {
      try {
        const stateId = stateIds.get(key(r.Type!.trim(), r.Status!.trim()))!;
        await sharePointClient.updateListItem(sharePoint.lists.records, r.ID, { [RECORD_STATE_LOOKUP]: stateId });
        recordsSet++;
      } catch (err: any) {
        errors.push(`Record ${r.ID}: ${err.message}`);
      }
    }));
  }
  sharePointClient.clearCacheKey('records');
  return { ...report, recordsSet, errors };
}
