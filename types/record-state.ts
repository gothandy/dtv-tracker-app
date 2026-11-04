/**
 * A Record's State and how it shows (Records v2, #322 §1–3), shared by the server and the browser.
 *
 * - **From State** (Before empty): something that happened on the Record's Date and holds from
 *   then on; shows its After label (or its Name when After is blank).
 * - **Until State** (Before filled): something that holds until the Record's Date (e.g. an
 *   expiry); shows its Before label up to and including the Date, then its After label.
 */

/** A States list item, as the app reads it. */
export interface RecordState {
  id: number;
  /** The Record Type it belongs to. */
  type: string;
  /** What Add and Edit offer, and what the rules in code match on. */
  name: string;
  before?: string;
  after?: string;
  beforeStyle?: string;
  afterStyle?: string;
}

/** A State's style: Active (green), Info (gold), Warn (dirt); none = Default (sand). */
export type RecordStateStyle = 'active' | 'info' | 'warn';

const STYLES: Record<string, RecordStateStyle> = { Active: 'active', Info: 'info', Warn: 'warn' };

/** An Until State has a Before label; a From State doesn't. */
export function isUntil(state: RecordState): boolean {
  return !!state.before?.trim();
}

/**
 * Whether the Record shows its Before side on `onDate` (YYYY-MM-DD): only an Until State, up to
 * and including its Date (a blank Date counts as not yet reached).
 */
export function showsBefore(state: RecordState, date: string | undefined, onDate: string): boolean {
  if (!isUntil(state)) return false;
  const day = (date ?? '').substring(0, 10);
  return !day || onDate <= day;
}

/** The label the Record shows on `onDate`. */
export function stateLabel(state: RecordState, date: string | undefined, onDate: string): string {
  if (showsBefore(state, date, onDate)) return state.before!.trim();
  return state.after?.trim() || state.name;
}

/** The style the Record shows on `onDate`: the style of the side showing, with no fallback to the other. */
export function stateStyle(state: RecordState, date: string | undefined, onDate: string): RecordStateStyle | undefined {
  const style = showsBefore(state, date, onDate) ? state.beforeStyle : state.afterStyle;
  return style ? STYLES[style] : undefined;
}
