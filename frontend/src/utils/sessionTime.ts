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

/** Formats session start time and duration for display, e.g. "9:30 to 12:30 (3h)". */
export function formatSessionTimeRange(time?: string, lengthHours?: number): string | null {
  if (!time && lengthHours === undefined) return null

  const startMinutes = time ? parseTimeToMinutes(time) : null
  const lengthLabel = lengthHours !== undefined ? formatLengthHours(lengthHours) : null

  if (startMinutes !== null && lengthHours !== undefined && lengthHours > 0) {
    const endMinutes = startMinutes + lengthHours * 60
    return `${formatMinutesAsTime(startMinutes)} to ${formatMinutesAsTime(endMinutes)} (${lengthLabel})`
  }
  if (startMinutes !== null) return formatMinutesAsTime(startMinutes)
  if (lengthLabel) return lengthLabel
  return null
}
