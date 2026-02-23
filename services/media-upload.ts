import path from 'path';
import ExifReader from 'exifreader';

export function mediaDriveId(): string {
  const id = process.env.MEDIA_LIBRARY_DRIVE_ID;
  if (!id) throw new Error('MEDIA_LIBRARY_DRIVE_ID is not configured');
  return id;
}

// Extract DateTimeOriginal from EXIF. Returns null if not present or unreadable.
// EXIF format: "2026:02:21 14:30:22"
export function exifDate(buffer: Buffer): Date | null {
  try {
    const tags = ExifReader.load(buffer, { expanded: false });
    const raw = (tags['DateTimeOriginal'] as any)?.description as string | undefined;
    if (!raw) return null;
    const [datePart, timePart] = raw.split(' ');
    const [y, mo, d] = datePart.split(':').map(Number);
    const [h, mi, s] = timePart.split(':').map(Number);
    const dt = new Date(y, mo - 1, d, h, mi, s);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
}

// Generates a filename from the uploader's name, photo timestamp, and original filename.
// Format: {HH}-{MM}-{SS}-{uploader-name}-{4-char-suffix}.{ext}
// e.g. 14-30-22-john-smith-img1.jpg
export function mediaFilename(originalName: string, uploaderName: string, takenAt: Date): string {
  const hh = String(takenAt.getHours()).padStart(2, '0');
  const mm = String(takenAt.getMinutes()).padStart(2, '0');
  const ss = String(takenAt.getSeconds()).padStart(2, '0');
  const name = uploaderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const stem = path.basename(originalName, path.extname(originalName));
  const suffix = stem.replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase() || 'img';
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  return `${hh}-${mm}-${ss}-${name}-${suffix}${ext}`;
}
