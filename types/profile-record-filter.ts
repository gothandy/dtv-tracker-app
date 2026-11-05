/**
 * The Profiles list's Record filters (Type and State), shared by the browser filter and the
 * Profiles CSV API so they always agree. State works with or without a Type:
 * - Type only: has a Record of the Type
 * - Type + State: the Type's Record has the State; State "No record": has none of the Type
 * - State only: any Record has the State; State "No record": has no Records at all
 * A Profile has one Record per Type in these lists (the latest; today, the first match).
 */

export interface ProfileRecordFacts {
  type: string;
  state: string;
}

/** The State filter's "No record" choice. */
export const NO_RECORD = 'none';

export function matchesProfileRecordFilter(records: ProfileRecordFacts[], recordType: string, recordState: string): boolean {
  const ofType = recordType ? records.filter(r => r.type === recordType) : records;
  if (recordState === NO_RECORD) return ofType.length === 0;
  if (recordState) return ofType.some(r => r.state === recordState);
  return recordType ? ofType.length > 0 : true;
}

/** One Record per Type, the first of each in list order (Records v2's latest selector replaces this). */
export function oneRecordPerType<T extends { type: string }>(records: T[]): T[] {
  const seen = new Set<string>();
  return records.filter(r => !seen.has(r.type) && !!seen.add(r.type));
}
