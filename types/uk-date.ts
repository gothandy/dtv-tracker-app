/**
 * UK calendar dates, as YYYY-MM-DD. Shared by the server and the browser.
 *
 * Session and Record dates are UK calendar days. `toISOString()` gives the UTC date, which
 * is yesterday between midnight and 1am UK time in summer, so use these instead.
 */

export const UK_TIMEZONE = 'Europe/London';

const ukDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: UK_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The UK calendar date of a moment in time. */
export function ukDate(moment: Date): string {
  const parts = ukDateFormat.formatToParts(moment);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Today's date in the UK. */
export function ukToday(now: Date = new Date()): string {
  return ukDate(now);
}

/** The same UK date a year ago: the start of the rolling 12 months. 29 Feb becomes 1 Mar. */
export function ukYearAgo(now: Date = new Date()): string {
  const [year, month, day] = ukToday(now).split('-').map(Number);
  return new Date(Date.UTC(year - 1, month - 1, day)).toISOString().slice(0, 10);
}
