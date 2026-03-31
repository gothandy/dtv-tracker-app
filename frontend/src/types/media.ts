export interface MediaItem {
  id: string
  thumbnailUrl: string
  largeUrl: string
  mimeType: string       // e.g. 'image/jpeg', 'video/mp4'
  title: string | null
  isPublic: boolean
  // Measured client-side before Embla init — not from the API
  _w?: number
  _h?: number
}
