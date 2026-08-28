import { describe, it, expect } from 'vitest'
import { apiErrorMessage } from './api-error'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiErrorMessage', () => {
  it('prefers message over error and fallback', async () => {
    const res = jsonResponse(500, {
      success: false,
      error: 'Failed to fetch sessions from SharePoint',
      message: 'Entra ID secret needs updating, see readme.',
    })
    expect(await apiErrorMessage(res, 'Failed to load sessions (500)')).toBe(
      'Entra ID secret needs updating, see readme.',
    )
  })

  it('uses error when message is missing', async () => {
    const res = jsonResponse(500, { success: false, error: 'Something broke' })
    expect(await apiErrorMessage(res, 'fallback')).toBe('Something broke')
  })

  it('uses fallback for non-JSON bodies', async () => {
    const res = new Response('not json', { status: 502 })
    expect(await apiErrorMessage(res, 'Failed to load (502)')).toBe('Failed to load (502)')
  })
})
