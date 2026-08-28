import { describe, it, expect } from 'vitest'
import { decodePythonBytesName, formatEventbriteError } from './eventbrite-client'

describe('decodePythonBytesName', () => {
  it('decodes separate first and last bytes literals', () => {
    expect(decodePythonBytesName("b'PAUL' b'HARTWELL'")).toBe('PAUL HARTWELL')
    expect(decodePythonBytesName("b'josh' b'Friday'")).toBe('josh Friday')
  })

  it('decodes a single bytes literal that contains a space', () => {
    expect(decodePythonBytesName("b'Paul Hartwell'")).toBe('Paul Hartwell')
  })

  it('decodes multiword names inside either literal', () => {
    expect(decodePythonBytesName("b'Mary Jane' b'Smith'")).toBe('Mary Jane Smith')
    expect(decodePythonBytesName("b'Mary' b'Van Dyke'")).toBe('Mary Van Dyke')
  })

  it('decodes mixed tokens (only the bytes ones)', () => {
    expect(decodePythonBytesName("b'josh' Friday")).toBe('josh Friday')
  })

  it('accepts double quotes and uppercase B prefix', () => {
    expect(decodePythonBytesName('b"PAUL" b"HARTWELL"')).toBe('PAUL HARTWELL')
    expect(decodePythonBytesName("B'PAUL'")).toBe('PAUL')
    expect(decodePythonBytesName('b"Mary Jane" b"Van Dyke"')).toBe('Mary Jane Van Dyke')
  })

  it('leaves ordinary names unchanged', () => {
    expect(decodePythonBytesName('Paul Hartwell')).toBe('Paul Hartwell')
    expect(decodePythonBytesName("O'Brien")).toBe("O'Brien")
    expect(decodePythonBytesName('Jane Smith-Jones')).toBe('Jane Smith-Jones')
  })

  it('returns empty string for missing or blank input', () => {
    expect(decodePythonBytesName(undefined)).toBe('')
    expect(decodePythonBytesName('  ')).toBe('')
  })

  it('decodes UTF-8 hex escapes inside a bytes literal', () => {
    expect(decodePythonBytesName(String.raw`b'Jos\xc3\xa9'`)).toBe('José')
    expect(decodePythonBytesName(String.raw`b'Jos\xc3\xa9' b'Smith'`)).toBe('José Smith')
  })
})

describe('formatEventbriteError', () => {
  it('does not dump HTML from a 502 gateway page', () => {
    expect(formatEventbriteError(502, '<html><head><title>502 Bad Gateway</title></head></html>'))
      .toBe('Eventbrite API 502 — their service is temporarily unavailable. Try again shortly.')
  })

  it('keeps a short JSON error body for other statuses', () => {
    expect(formatEventbriteError(401, '{"error":"INVALID_AUTH"}')).toBe('Eventbrite API 401: {"error":"INVALID_AUTH"}')
  })
})
