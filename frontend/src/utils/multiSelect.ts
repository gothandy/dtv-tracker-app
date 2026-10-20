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

/** What the closed filter shows: the All label, or which options are crossed out. */
export function multiSelectSummary(options: MultiSelectOption[], excluded: string[], allLabel: string): string {
  const hidden = options.filter(o => excluded.includes(o.value)).map(o => o.label)
  if (!hidden.length) return allLabel
  return hidden.length <= 2 ? `Hiding: ${hidden.join(', ')}` : `Hiding ${hidden.length}`
}

/** A list of values from the address (`?hide=Closed,Draft`), and back. */
export const parseValueList = (raw: unknown): string[] =>
  typeof raw === 'string' && raw ? raw.split(',').filter(Boolean) : []
export const valueListParam = (values: string[]): string | undefined =>
  values.length ? values.join(',') : undefined
