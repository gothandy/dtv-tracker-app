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

  it('decodes mixed tokens (only the bytes ones)', () => {
    expect(decodePythonBytesName("b'josh' Friday")).toBe('josh Friday')
  })

  it('accepts double quotes and uppercase B prefix', () => {
    expect(decodePythonBytesName('b"PAUL" b"HARTWELL"')).toBe('PAUL HARTWELL')
    expect(decodePythonBytesName("B'PAUL'")).toBe('PAUL')
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
