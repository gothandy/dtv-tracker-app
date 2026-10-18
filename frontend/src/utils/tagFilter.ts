/** Tag filter value for items with no tags (TermPicker's "No tags"). */
export const NO_TAGS = '__none__'

/**
 * Whether an item's tags match the tag filter: '' matches everything, NO_TAGS matches
 * untagged items, and a tag matches itself and everything beneath it ("XC" matches "XC:Verderers").
 */
export function matchesTag(tags: Array<{ label: string }> | undefined, filter: string): boolean {
  if (!filter) return true
  if (filter === NO_TAGS) return !tags?.length
  return tags?.some(t => t.label === filter || t.label.startsWith(filter + ':')) ?? false
}
