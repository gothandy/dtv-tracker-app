/**
 * The calendar date in the UK, as YYYY-MM-DD.
 *
 * Record dates are UK calendar days. `toISOString()` gives the UTC date, which is
 * yesterday between midnight and 1am UK time in summer, so use this instead.
 */
const ukDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function ukToday(now: Date = new Date()): string {
  const parts = ukDateFormat.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
