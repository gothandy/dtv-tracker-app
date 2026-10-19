/**
 * Where a dropdown's list goes, relative to its box: below it, or above when there isn't
 * room below and there's more above. Pure, so it can be tested; useDropdownPanel applies it.
 */

/** The box the list hangs from, as getBoundingClientRect gives it. */
export interface AnchorRect { top: number; bottom: number; left: number; width: number }

/** The part of the page that's visible: on a phone, above the keyboard when it's up. */
export interface VisibleArea { top: number; bottom: number; layoutHeight: number }

export interface Placement {
  side: 'below' | 'above'
  /** CSS `top` (below) or `bottom` (above), in px, for a `position: fixed` list */
  top?: number
  bottom?: number
  left: number
  width: number
  /** The list's height limit: its own maximum, or the room on its side if that's less */
  maxHeight: number
}

/** Gap between the box and the list, and the margin kept from the edge of the visible area. */
export const GAP = 4
export const MARGIN = 8
/** Below is preferred while it has at least this much room (or as much as the list wants). */
export const MIN_BELOW = 160

export function placeDropdown(anchor: AnchorRect, area: VisibleArea, wantedHeight: number): Placement {
  const below = area.bottom - anchor.bottom - GAP - MARGIN
  const above = anchor.top - area.top - GAP - MARGIN
  const fitsBelow = below >= Math.min(wantedHeight, MIN_BELOW)
  const side = fitsBelow || below >= above ? 'below' : 'above'
  const room = Math.max(0, side === 'below' ? below : above)
  return {
    side,
    ...(side === 'below'
      ? { top: anchor.bottom + GAP }
      : { bottom: area.layoutHeight - anchor.top + GAP }),
    left: anchor.left,
    width: anchor.width,
    maxHeight: Math.min(wantedHeight, room),
  }
}
