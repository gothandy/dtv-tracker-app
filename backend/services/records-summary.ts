/**
 * Records summary — totals only, for planning the Records v2 migration (#322).
 *
 * Downloaded from Tools, so it must hold no volunteer data: no names, emails, Profile or
 * Record IDs. Each Profile result is a count plus a fingerprint (SHA-256 of the sorted
 * Profile IDs), so a later run can show whether the same Profiles get each result without
 * revealing who they are.
 */

import crypto from 'crypto';
import { SharePointRecord } from '../../types/sharepoint';
import { buildBadgeLookups, recordProfileId } from './records';
import { PROFILE_STATS } from './field-names';

/** Records columns the migration needs to know about, by display or internal name. */
const RECORDS_COLUMNS = ['Type', 'Status', 'Date', 'Start', 'End', 'Notes'];

const COLUMN_KINDS = ['text', 'choice', 'dateTime', 'lookup', 'number', 'boolean'];

export interface ColumnSummary {
  name: string;
  displayName: string;
  kind: string;
  dateFormat?: string;
  choices?: string[];
  readOnly: boolean;
}

export interface StatusSummary {
  count: number;
  blankDate: number;
  earliestDate: string | null;
  latestDate: string | null;
  dateAfterToday: number;
}

export interface TypeSummary {
  total: number;
  byStatus: Record<string, StatusSummary>;
  /** Profile and Type pairs with more than one Record, and how many Records they hold. */
  profilesWithMoreThanOne: number;
  recordsInThosePairs: number;
}

export interface ProfileResult {
  count: number;
  fingerprint: string;
}

export interface RecordsSummary {
  environment: string;
  generatedAt: string;
  today: string;
  /** Matching columns on the Records list; more than one entry under a name is a duplicate. */
  columns: Record<string, ColumnSummary[]>;
  records: {
    total: number;
    withoutProfile: number;
    byType: Record<string, TypeSummary>;
  };
  profiles: {
    total: number;
    withoutStats: number;
    /** As the Profiles page shows them: worked out from Records. */
    members: ProfileResult;
    cardStatus: Record<string, ProfileResult>;
    /** As session check-in shows them: read from the stored Profile Stats. */
    firstAiders: ProfileResult;
    noPhoto: ProfileResult;
  };
}

interface SummaryProfile {
  ID: number;
  [PROFILE_STATS]?: string;
}

function profileResult(ids: Iterable<number>): ProfileResult {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  const fingerprint = crypto.createHash('sha256').update(sorted.join(',')).digest('hex');
  return { count: sorted.length, fingerprint };
}

function summariseColumn(column: any): ColumnSummary {
  const kind = COLUMN_KINDS.find(k => column[k] !== undefined) ?? 'other';
  return {
    name: column.name,
    displayName: column.displayName,
    kind,
    ...(column.dateTime?.format ? { dateFormat: column.dateTime.format } : {}),
    ...(column.choice?.choices ? { choices: column.choice.choices } : {}),
    readOnly: !!column.readOnly,
  };
}

function summariseColumns(columns: any[]): Record<string, ColumnSummary[]> {
  const result: Record<string, ColumnSummary[]> = {};
  for (const wanted of RECORDS_COLUMNS) {
    result[wanted] = columns
      .filter(c => c.name === wanted || c.displayName === wanted)
      .map(summariseColumn);
  }
  return result;
}

function summariseRecordsByType(records: SharePointRecord[], today: string): Record<string, TypeSummary> {
  const byType: Record<string, TypeSummary> = {};
  const pairCounts = new Map<string, Map<number, number>>();

  for (const r of records) {
    const type = r.Type || '(blank)';
    const status = r.Status || '(blank)';
    const date = r.Date ? r.Date.substring(0, 10) : '';

    const typeSummary = byType[type] ??= { total: 0, byStatus: {}, profilesWithMoreThanOne: 0, recordsInThosePairs: 0 };
    typeSummary.total++;

    const s = typeSummary.byStatus[status] ??= { count: 0, blankDate: 0, earliestDate: null, latestDate: null, dateAfterToday: 0 };
    s.count++;
    if (!date) {
      s.blankDate++;
    } else {
      if (!s.earliestDate || date < s.earliestDate) s.earliestDate = date;
      if (!s.latestDate || date > s.latestDate) s.latestDate = date;
      if (date > today) s.dateAfterToday++;
    }

    const pid = recordProfileId(r);
    if (pid === undefined) continue;
    const counts = pairCounts.get(type) ?? new Map<number, number>();
    pairCounts.set(type, counts);
    counts.set(pid, (counts.get(pid) ?? 0) + 1);
  }

  for (const [type, counts] of pairCounts) {
    for (const n of counts.values()) {
      if (n < 2) continue;
      byType[type].profilesWithMoreThanOne++;
      byType[type].recordsInThosePairs += n;
    }
  }
  return byType;
}

export function summariseRecords(input: {
  environment: string;
  generatedAt: string;
  today: string;
  records: SharePointRecord[];
  profiles: SummaryProfile[];
  recordsColumns: any[];
}): RecordsSummary {
  const { records, profiles, today } = input;

  const { memberIds, cardStatusMap } = buildBadgeLookups(records, today);
  const cardIdsByStatus = new Map<string, number[]>();
  for (const [pid, status] of cardStatusMap) {
    cardIdsByStatus.set(status, [...(cardIdsByStatus.get(status) ?? []), pid]);
  }

  const firstAiderIds: number[] = [];
  const noPhotoIds: number[] = [];
  let withoutStats = 0;
  for (const p of profiles) {
    let stats: any = null;
    try { stats = p[PROFILE_STATS] ? JSON.parse(p[PROFILE_STATS]) : null; } catch { stats = null; }
    if (!stats) { withoutStats++; continue; }
    if (stats.isFirstAider === true) firstAiderIds.push(p.ID);
    if (stats.noPhoto === true) noPhotoIds.push(p.ID);
  }

  return {
    environment: input.environment,
    generatedAt: input.generatedAt,
    today,
    columns: summariseColumns(input.recordsColumns),
    records: {
      total: records.length,
      withoutProfile: records.filter(r => recordProfileId(r) === undefined).length,
      byType: summariseRecordsByType(records, today),
    },
    profiles: {
      total: profiles.length,
      withoutStats,
      members: profileResult(memberIds),
      cardStatus: Object.fromEntries([...cardIdsByStatus].map(([status, ids]) => [status, profileResult(ids)])),
      firstAiders: profileResult(firstAiderIds),
      noPhoto: profileResult(noPhotoIds),
    },
  };
}
