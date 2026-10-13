/**
 * A return address after sign-in must be a path on this site. "//evil.example" and
 * "/\evil.example" also start with "/", but browsers treat them as another site.
 * Same rule as backend/services/safe-return.ts.
 */
export function safeReturnPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  if (value.length > 500 || /[\u0000-\u001f]/.test(value)) return undefined
  return value
}
