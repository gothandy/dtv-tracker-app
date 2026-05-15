import type { EntryListItemResponse } from '../../../types/api-responses'

export type EntryQualityFilterValue = '' | 'error' | 'no-error'

export type EntryQualityOption = {
  value: EntryQualityFilterValue
  label: string
}

function sessionDateOnly(date: string): string {
  return date.substring(0, 10)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isPastSession(sessionDate: string, today: string = todayIsoDate()): boolean {
  return sessionDateOnly(sessionDate) < today
}

/** Past session with no hours recorded (covers legacy rows with or without check-in). */
export function isEntryError(entry: EntryListItemResponse, today?: string): boolean {
  if (entry.cancelled) return false
  return isPastSession(entry.date, today) && entry.hours === 0
}

export function matchesEntryQualityFilter(
  entry: EntryListItemResponse,
  filterValue: string,
  today?: string,
): boolean {
  if (!filterValue) return true
  const normalized =
    filterValue === 'unchecked' || filterValue === 'no-hours' ? 'error' : filterValue
  switch (normalized as EntryQualityFilterValue) {
    case 'error':
      return isEntryError(entry, today)
    case 'no-error':
      return !isEntryError(entry, today)
    default:
      return true
  }
}

export function entryQualityOptionsForEntries(
  entries: EntryListItemResponse[],
  today?: string,
): EntryQualityOption[] {
  const options: EntryQualityOption[] = []
  let hasError = false
  let hasNoError = false

  for (const e of entries) {
    if (isEntryError(e, today)) hasError = true
    else hasNoError = true
  }

  if (hasError) options.push({ value: 'error', label: 'Entry error' })
  if (hasNoError) options.push({ value: 'no-error', label: 'No entry error' })

  return options
}

export function showEntryQualityFilter(entries: EntryListItemResponse[], today?: string): boolean {
  return entries.some(e => isEntryError(e, today))
}

export function isEntryQualityFilterAvailable(
  filterValue: string,
  entries: EntryListItemResponse[],
  today?: string,
): boolean {
  if (!filterValue) return true
  const normalized =
    filterValue === 'unchecked' || filterValue === 'no-hours' ? 'error' : filterValue
  return entryQualityOptionsForEntries(entries, today).some(o => o.value === normalized)
}
