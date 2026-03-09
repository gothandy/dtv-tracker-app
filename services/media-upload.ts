import path from 'path';
import ExifReader from 'exifreader';

export function mediaDriveId(): string {
  const id = process.env.MEDIA_LIBRARY_DRIVE_ID;
  if (!id) throw new Error('MEDIA_LIBRARY_DRIVE_ID is not configured');
  return id;
}

// Extract capture/creation date from media file metadata.
// For images: reads EXIF DateTimeOriginal (format: "2026:02:21 14:30:22")
// For videos: reads CreationDate or CreateDate from MP4/MOV container metadata
export function exifDate(buffer: Buffer): Date | null {
  try {
    const tags = ExifReader.load(buffer, { expanded: false });

    // Images: EXIF DateTimeOriginal
    const exifRaw = (tags['DateTimeOriginal'] as any)?.description as string | undefined;
    if (exifRaw) {
      const [datePart, timePart] = exifRaw.split(' ');
      const [y, mo, d] = datePart.split(':').map(Number);
      const [h, mi, s] = timePart.split(':').map(Number);
      const dt = new Date(y, mo - 1, d, h, mi, s);
      if (!isNaN(dt.getTime())) return dt;
    }

    // Videos: MP4/MOV container creation date (already a JS Date string or ISO string)
    const videoRaw = ((tags['CreationDate'] ?? tags['CreateDate']) as any)?.description as string | undefined;
    if (videoRaw) {
      const dt = new Date(videoRaw);
      if (!isNaN(dt.getTime())) return dt;
    }

    return null;
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
