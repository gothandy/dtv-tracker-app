export function shareCurrentUrl(): void {
  const url = window.location.href
  if (navigator.share) {
    navigator.share({ url }).catch(() => {})
  } else if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).catch(() => {})
  }
}
