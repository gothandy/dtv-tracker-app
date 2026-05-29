import type { SessionResponse } from '../../../types/api-responses'
import type { MediaItem } from '../types/media'

export function sessionCoverCarouselTitle(s: SessionResponse): string {
  const dateStr = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const sessionName = s.displayName?.trim()
  return sessionName ? `${dateStr}, ${sessionName}` : dateStr
}

export function buildSessionCoverCarouselItems(sessions: SessionResponse[]): MediaItem[] {
  return [...sessions]
    .filter(s => !!s.coverUrl)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(s => ({
      id: String(s.id),
      listItemId: 0,
      url: s.coverUrl!,
      mimeType: 'image/jpeg',
      title: sessionCoverCarouselTitle(s),
      isPublic: true,
    }))
}
