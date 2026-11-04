/**
 * What an entry Save's `cancelled` value changes. Edit Entry always sends it, so it only counts
 * when it differs from the entry: `false` on an entry that isn't cancelled changes nothing.
 */
export type CancelledChange = { kind: 'none' } | { kind: 'set'; value: string | null };

export function cancelledChange(
  requested: boolean,
  currentlyCancelled: string | null | undefined,
  now: string = new Date().toISOString(),
): CancelledChange {
  if (requested === !!currentlyCancelled) return { kind: 'none' }; // keeps the original cancellation date
  return { kind: 'set', value: requested ? now : null };
}
