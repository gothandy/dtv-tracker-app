/**
 * Short-code store for volunteer photo upload links.
 *
 * Codes are 4 uppercase letters, held in a module-level Map (code → entryId).
 * Expiry is not stored here — it is checked at validation time against the
 * session date fetched from SharePoint (session date + 7 days).
 *
 * Known limitation: codes are lost on server restart. If this becomes a problem,
 * migrate to UploadCode / UploadExpiry columns on the Entries list.
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const codes = new Map<string, number>(); // code → entryId

export function generateCode(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * 26)]).join('');
    if (!codes.has(code)) return code;
  }
  throw new Error('Failed to generate a unique upload code after 10 attempts');
}

export function storeCode(code: string, entryId: number): void {
  // Remove any existing code for this entry (handles resend)
  for (const [existingCode, eid] of codes) {
    if (eid === entryId) codes.delete(existingCode);
  }
  codes.set(code, entryId);
}

export function lookupCode(code: string): number | undefined {
  return codes.get(code.toUpperCase());
}
