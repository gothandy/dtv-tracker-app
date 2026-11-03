/**
 * Records v2 migration (#322 §5), run from Tools. Safe to run again: each run makes the lists
 * right, whatever state they are in, and a repeat run finds nothing to do.
 * - Each Record's Type and Status picks its State (match on Type, then Name = the Status); a
 *   missing State is inserted.
 * - Each State's Title is "{Type} {Name}"; a wrong one is overwritten.
 * - Each Record's State lookup is set to its State if it isn't already (blank, a deleted State,
 *   or another State).
 * It never changes a Record's Type, Status, Date or Notes. A dry run reports what it would do
 * and writes nothing. Temporary: removed in Records v2 PR 1 (#323).
 */

import { sharePointClient } from './sharepoint-client';
import { statesRepository, stateTitle, type SharePointState } from './repositories/states-repository';
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

/** Each Type and Name's State ID; if the list has the same one twice, the lowest ID. */
function stateIdsByKey(states: SharePointState[]): Map<string, number> {
  const ids = new Map<string, number>();
  for (const s of [...states].sort((a, b) => a.ID - b.ID)) {
    if (s.Type && s.Name && !ids.has(key(s.Type, s.Name))) ids.set(key(s.Type, s.Name), s.ID);
  }
  return ids;
}

/** The Record's Type and Status, trimmed, or undefined if either is blank. */
function typeAndStatus(r: MigrationRecord): { type: string; status: string } | undefined {
  const type = r.Type?.trim() ?? '';
  const status = r.Status?.trim() ?? '';
  return type && status ? { type, status } : undefined;
}

export interface MigrationPlan {
  /** States to insert: one per Type and Status not yet in the States list. */
  statesToInsert: Array<{ type: string; name: string }>;
  /** States whose Title isn't "{Type} {Name}", to overwrite. */
  titlesToSet: Array<{ id: number; from: string; to: string }>;
  /** Records whose State is blank or not their Type and Status's State, by Type then Status, with how many. */
  recordsToSet: Record<string, Record<string, number>>;
  /** Records already on the right State (left alone). */
  alreadySet: number;
  /** Records with no Type or no Status (skipped, need a look). */
  missingTypeOrStatus: Array<{ id: number; type: string; status: string }>;
}

/** What the migration would do, from the Records and the States list as they are. */
export function planMigration(records: MigrationRecord[], states: SharePointState[]): MigrationPlan {
  const ids = stateIdsByKey(states);
  const toInsert = new Map<string, { type: string; name: string }>();
  const recordsToSet: MigrationPlan['recordsToSet'] = {};
  const missingTypeOrStatus: MigrationPlan['missingTypeOrStatus'] = [];
  let alreadySet = 0;

  for (const r of records) {
    const ts = typeAndStatus(r);
    if (!ts) { missingTypeOrStatus.push({ id: r.ID, type: r.Type?.trim() ?? '', status: r.Status?.trim() ?? '' }); continue; }
    const id = ids.get(key(ts.type, ts.status));
    if (id !== undefined && safeParseLookupId(r.StateLookupId) === id) { alreadySet++; continue; }
    if (id === undefined) toInsert.set(key(ts.type, ts.status), { type: ts.type, name: ts.status });
    recordsToSet[ts.type] ??= {};
    recordsToSet[ts.type][ts.status] = (recordsToSet[ts.type][ts.status] ?? 0) + 1;
  }

  const titlesToSet = states
    .filter(s => s.Type && s.Name && (s.Title ?? '') !== stateTitle(s.Type, s.Name))
    .map(s => ({ id: s.ID, from: s.Title ?? '', to: stateTitle(s.Type!, s.Name!) }));

  return { statesToInsert: [...toInsert.values()], titlesToSet, recordsToSet, alreadySet, missingTypeOrStatus };
}

export interface MigrationReport extends MigrationPlan {
  environment: string;
  generatedAt: string;
  dryRun: boolean;
  recordsTotal: number;
  statesBefore: number;
  /** After a run: Titles and Records set, and any that failed. */
  titlesSet?: number;
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

  // Insert each missing State and fix each Title, then set every Record not on its State
  const ids = stateIdsByKey(states);
  const errors: string[] = [];
  for (const s of plan.statesToInsert) {
    ids.set(key(s.type, s.name), await statesRepository.create({ Name: s.name, Type: s.type }));
  }
  let titlesSet = 0;
  for (const t of plan.titlesToSet) {
    try {
      await statesRepository.updateTitle(t.id, t.to);
      titlesSet++;
    } catch (err: any) {
      errors.push(`State ${t.id} Title: ${err.message}`);
    }
  }

  const toSet = records.flatMap(r => {
    const ts = typeAndStatus(r);
    const stateId = ts && ids.get(key(ts.type, ts.status));
    return stateId !== undefined && safeParseLookupId(r.StateLookupId) !== stateId ? [{ id: r.ID, stateId }] : [];
  });
  let recordsSet = 0;
  for (let i = 0; i < toSet.length; i += 10) {
    await Promise.all(toSet.slice(i, i + 10).map(async r => {
      try {
        await sharePointClient.updateListItem(sharePoint.lists.records, r.id, { [RECORD_STATE_LOOKUP]: r.stateId });
        recordsSet++;
      } catch (err: any) {
        errors.push(`Record ${r.id}: ${err.message}`);
      }
    }));
  }
  sharePointClient.clearCacheKey('records');
  return { ...report, titlesSet, recordsSet, errors };
}
