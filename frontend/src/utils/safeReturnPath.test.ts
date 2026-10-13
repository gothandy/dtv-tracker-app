import { describe, it, expect } from 'vitest'
import { safeReturnPath } from './safeReturnPath'

describe('safeReturnPath', () => {
  it('accepts paths on this site', () => {
    expect(safeReturnPath('/sessions/sat/2026-10-17')).toBe('/sessions/sat/2026-10-17')
    expect(safeReturnPath('/profiles?tab=records')).toBe('/profiles?tab=records')
  })

  it('rejects other sites and junk', () => {
    expect(safeReturnPath('//evil.example')).toBeUndefined()
    expect(safeReturnPath('/\\evil.example')).toBeUndefined()
    expect(safeReturnPath('https://evil.example')).toBeUndefined()
    expect(safeReturnPath('/a\nb')).toBeUndefined()
    expect(safeReturnPath(undefined)).toBeUndefined()
    expect(safeReturnPath(42)).toBeUndefined()
  })
})
