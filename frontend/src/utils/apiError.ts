/** Prefer server `message` / `error` over a status-only fallback. */
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json() as { message?: unknown; error?: unknown }
    if (typeof json.message === 'string' && json.message.trim()) return json.message
    if (typeof json.error === 'string' && json.error.trim()) return json.error
  } catch {
    // non-JSON body
  }
  return fallback
}
