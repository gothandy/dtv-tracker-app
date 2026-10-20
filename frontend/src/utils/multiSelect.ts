/**
 * The rules behind MultiSelectFilter, a filter where every option starts ticked and each can be
 * crossed out (left out of the results). Pure, so they can be tested.
 */

export interface MultiSelectOption { value: string; label: string }

/** Value of the "All …" choice, which puts every tick back. */
export const MULTI_SELECT_ALL = '__all__'

/** The crossed-out values after choosing `value`: All clears them; any other flips that one. */
export function toggleExcluded(excluded: string[], value: string): string[] {
  if (value === MULTI_SELECT_ALL) return []
  return excluded.includes(value) ? excluded.filter(v => v !== value) : [...excluded, value]
}

/**
 * The one option still ticked, if only one is: it can't be crossed out, so the filter never
 * hides everything (AGENTS.md, Filters cascade). Undefined while two or more are ticked.
 */
export function lastTicked(options: MultiSelectOption[], excluded: string[]): string | undefined {
  const shown = options.filter(o => !excluded.includes(o.value))
  return shown.length === 1 ? shown[0].value : undefined
}

/**
 * What the closed filter shows: the All label, *All hidden* (only from an address that
 * crosses out everything; the page shows no matches rather than breaking), or the shorter of the two lists:
 * the ticked options (*Show: No status, Closed*) or the crossed-out ones (*Hide: Closed*).
 * A tie names the ticked ones.
 */
export function multiSelectSummary(options: MultiSelectOption[], excluded: string[], allLabel: string): string {
  const hidden = options.filter(o => excluded.includes(o.value)).map(o => o.label)
  const shown = options.filter(o => !excluded.includes(o.value)).map(o => o.label)
  if (!hidden.length) return allLabel
  if (!shown.length) return 'All hidden'
  return shown.length <= hidden.length ? `Show: ${shown.join(', ')}` : `Hide: ${hidden.join(', ')}`
}

/** A list of values from the address (`?hide=Closed,Draft`), and back. */
export const parseValueList = (raw: unknown): string[] =>
  typeof raw === 'string' && raw ? raw.split(',').filter(Boolean) : []
export const valueListParam = (values: string[]): string | undefined =>
  values.length ? values.join(',') : undefined
