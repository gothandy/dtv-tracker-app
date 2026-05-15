/** Drop selected ids that are not in the current visible list (after client-side filters). */
export function pruneSelectionToVisible(
  selected: number[],
  visible: ReadonlyArray<{ id: number }>,
): number[] {
  const visibleIds = new Set(visible.map(item => item.id))
  return selected.filter(id => visibleIds.has(id))
}

export function visibleSelected<T extends { id: number }>(
  selected: number[],
  visible: ReadonlyArray<T>,
): T[] {
  return visible.filter(item => selected.includes(item.id))
}
