/** The Projects list's Status choices, as set in SharePoint (GET /api/projects/options). */
export async function fetchProjectStatuses(): Promise<string[]> {
  const res = await fetch('/api/projects/options')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json() as { data?: { statuses?: string[] } }
  return json.data?.statuses ?? []
}
