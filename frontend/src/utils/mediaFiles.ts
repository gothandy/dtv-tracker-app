const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v'])

/** True when the file is a video (MIME or extension fallback for mobile browsers). */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
  return VIDEO_EXTENSIONS.has(ext)
}
