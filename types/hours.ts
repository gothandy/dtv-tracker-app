/**
 * Hours bands, shared by the server and the browser. The boundaries are always 0, 15 and 30,
 * and a band includes its lower boundary: 15 hours is 15h+, 30 hours is 30h+.
 */

export const HOURS_BOUNDARIES = [15, 30] as const;

/** The Hours filter choices, in the order shown. Values are kept in the address (?hours=). */
export const HOURS_FILTERS = [
  { value: '0',      label: '0h',     matches: (h: number) => h === 0 },
  { value: 'lt15',   label: '<15h',   matches: (h: number) => h > 0 && h < 15 },
  { value: '15plus', label: '15h+',   matches: (h: number) => h >= 15 },
  { value: '15to30', label: '15–30h', matches: (h: number) => h >= 15 && h < 30 },
  { value: '30plus', label: '30h+',   matches: (h: number) => h >= 30 },
] as const;

/** Whether these hours are in the chosen Hours filter; no filter (or an unknown one) matches all. */
export function matchesHoursFilter(hours: number, filter: string | undefined): boolean {
  const choice = HOURS_FILTERS.find(f => f.value === filter);
  return choice ? choice.matches(hours) : true;
}

/** A Profile's hours for the chosen FY filter: all time for "all", otherwise the selected period. */
export function hoursInView(profile: { hoursAll: number; hoursThisFY: number }, fy: string): number {
  return fy === 'all' ? profile.hoursAll : profile.hoursThisFY;
}

/** A Profile's sessions for the chosen FY filter, as hoursInView. */
export function sessionsInView(profile: { sessionsAll: number; sessionsThisFY: number }, fy: string): number {
  return fy === 'all' ? profile.sessionsAll : profile.sessionsThisFY;
}
