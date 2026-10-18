/** Shown where Status can be set when its choices couldn't be loaded. */
export const STATUSES_ERROR = "Couldn't load the Status choices, so Status can't be set just now. Please reload the page."

/** The Projects list's Status choices, as set in SharePoint (GET /api/projects/options). */
export async function fetchProjectStatuses(): Promise<string[]> {
  const res = await fetch('/api/projects/options')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data?: { statuses?: string[] } }
  return json.data?.statuses ?? []
}
