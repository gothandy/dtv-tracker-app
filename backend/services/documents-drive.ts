/** Documents library drive — top-level Backups/ and Projects/{slug}/ folders. */
export function documentsDriveId(): string {
  const id = process.env.DOCUMENTS_DRIVE_ID?.trim();
  if (!id) throw new Error('DOCUMENTS_DRIVE_ID is not configured');
  return id;
}

export function tryDocumentsDriveId(): string | null {
  const id = process.env.DOCUMENTS_DRIVE_ID?.trim();
  return id || null;
}
