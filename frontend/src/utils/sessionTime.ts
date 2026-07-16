/** Matches backend DEFAULT_SESSION_TIME / DEFAULT_SESSION_LENGTH when SharePoint fields are blank. */
export const DEFAULT_SESSION_TIME = '09:30'
export const DEFAULT_SESSION_LENGTH = 3

export function resolveSessionTime(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return DEFAULT_SESSION_TIME
  return String(raw).trim() || DEFAULT_SESSION_TIME
}

export function resolveSessionLength(raw: string | number | null | undefined): number {
  if (raw === '' || raw === null || raw === undefined) return DEFAULT_SESSION_LENGTH
  const value = typeof raw === 'number' ? raw : parseFloat(String(raw).trim())
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_SESSION_LENGTH
  return value
}

function parseTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatMinutesAsTime(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes)
  const wrapped = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  return `${hours}:${String(minutes).padStart(2, '0')}`
}

function formatLengthHours(hours: number): string {
  const label = Number.isInteger(hours) ? String(hours) : String(hours)
  return `${label}h`
}

/**
 * Formats session start time and duration for display, e.g. "9:30 to 12:30 (3h)".
 * Blank / missing values use the same defaults as the API (09:30, 3h).
 */
export function formatSessionTimeRange(time?: string, lengthHours?: number): string {
  const resolvedTime = resolveSessionTime(time)
  const resolvedLength = resolveSessionLength(lengthHours)
  const startMinutes = parseTimeToMinutes(resolvedTime) ?? parseTimeToMinutes(DEFAULT_SESSION_TIME)!
  const endMinutes = startMinutes + resolvedLength * 60
  return `${formatMinutesAsTime(startMinutes)} to ${formatMinutesAsTime(endMinutes)} (${formatLengthHours(resolvedLength)})`
}
